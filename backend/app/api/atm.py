"""
POST /api/atm/check — верификация лица при снятии наличных.

Принимает основной кадр, optional challenge-кадр для liveness
и `profile_id`, после чего:
  1. сравнивает лицо с эталонным профилем
  2. проверяет "живость" через challenge-response
  3. возвращает итоговое решение для ATM UI
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.core.storage import get_profile
from app.ml.face_engine import FaceError, cosine_similarity, extract_embedding
from app.services.decision_engine import DecisionInput, Thresholds, evaluate_decision
from app.services.liveness import evaluate_liveness

router = APIRouter(tags=["atm"])
logger = logging.getLogger(__name__)


# ─── Types ────────────────────────────────────────────────

class DecisionFlags(BaseModel):
    face_detected: bool
    challenge_face_detected: bool = False
    multiple_faces: bool = False
    low_quality: bool = False
    needs_confirmation: bool = False
    should_retry: bool = False
    matched_profile: bool = False
    spoof_suspected: bool = False


class CheckResponse(BaseModel):
    decision: str                     # allow | ask_confirmation | delay_and_alert
    title: str
    message: str
    severity: str
    recommended_ui_action: str
    similarity_score: float | None = None
    normalized_confidence: float      # 0–100
    liveness_score: float | None = None
    liveness_status: str
    event_log: list[str]
    flags: DecisionFlags


class ErrorResponse(BaseModel):
    success: bool = False
    detail: str


# ─── Constants ────────────────────────────────────────────

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 МБ


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _map_range(
    value: float,
    in_min: float,
    in_max: float,
    out_min: float,
    out_max: float,
) -> float:
    if in_max <= in_min:
        return out_min
    ratio = (value - in_min) / (in_max - in_min)
    return out_min + ratio * (out_max - out_min)


def normalize_confidence(score: float) -> float:
    """
    Переводит raw similarity в UI-friendly confidence 0..100.

    Схема подобрана под демо:
      - ниже THRESHOLD_UNCERTAIN  → 0..49
      - между uncertain/match     → 50..79
      - выше THRESHOLD_MATCH      → 80..100

    Это делает решение понятнее на презентации и удобно калибруется
    вручную через два порога в config.py.
    """
    uncertain = settings.THRESHOLD_UNCERTAIN
    match = settings.THRESHOLD_MATCH
    bounded_score = _clamp(score, -1.0, 1.0)

    if bounded_score < uncertain:
        confidence = _map_range(bounded_score, -1.0, uncertain, 0.0, 49.0)
    elif bounded_score < match:
        confidence = _map_range(bounded_score, uncertain, match, 50.0, 79.0)
    else:
        confidence = _map_range(bounded_score, match, 1.0, 80.0, 100.0)

    return round(_clamp(confidence, 0.0, 100.0), 1)


def build_decision(score: float) -> tuple[str, str, DecisionFlags]:
    if score >= settings.THRESHOLD_MATCH:
        return (
            "allow",
            "Лицо уверенно совпадает с эталонным профилем.",
            DecisionFlags(
                face_detected=True,
                challenge_face_detected=False,
                matched_profile=True,
            ),
        )

    if score >= settings.THRESHOLD_UNCERTAIN:
        return (
            "ask_confirmation",
            "Есть частичное совпадение с эталоном. Нужна дополнительная проверка пользователем.",
            DecisionFlags(
                face_detected=True,
                challenge_face_detected=False,
                needs_confirmation=True,
            ),
        )

    return (
        "deny_or_delay",
        "Лицо не совпадает с эталонным профилем.",
        DecisionFlags(
            face_detected=True,
            challenge_face_detected=False,
            should_retry=True,
        ),
    )


def apply_liveness_to_decision(
    *,
    base_decision: str,
    base_reason: str,
    base_flags: DecisionFlags,
    liveness_status: str,
    liveness_reason: str,
    challenge_face_detected: bool,
    should_retry: bool,
    spoof_suspected: bool,
) -> tuple[str, str, DecisionFlags]:
    merged_flags = base_flags.model_copy(
        update={
            "challenge_face_detected": challenge_face_detected,
            "should_retry": base_flags.should_retry or should_retry,
            "spoof_suspected": spoof_suspected,
        }
    )

    if liveness_status == "passed":
        return base_decision, f"{base_reason} {liveness_reason}", merged_flags

    if liveness_status in {"failed", "not_checked"}:
        merged_flags = merged_flags.model_copy(
            update={
                "needs_confirmation": False,
                "should_retry": True,
                "spoof_suspected": True,
            }
        )
        return "deny_or_delay", liveness_reason, merged_flags

    merged_flags = merged_flags.model_copy(
        update={
            "needs_confirmation": True,
            "should_retry": True,
            "spoof_suspected": True,
        }
    )
    if base_decision == "deny_or_delay":
        return base_decision, f"{base_reason} {liveness_reason}", merged_flags
    return "ask_confirmation", liveness_reason, merged_flags


def log_check_result(
    *,
    profile_id: str,
    decision: str,
    similarity_score: float | None,
    normalized_confidence: float,
    liveness_score: float | None,
    liveness_status: str,
    reason: str,
    flags: DecisionFlags,
) -> None:
    logger.info(
        "ATM face check: profile_id=%s decision=%s similarity=%s confidence=%s "
        "liveness_score=%s liveness_status=%s face_detected=%s challenge_face_detected=%s "
        "multiple_faces=%s low_quality=%s needs_confirmation=%s should_retry=%s "
        "matched_profile=%s spoof_suspected=%s reason=%s",
        profile_id,
        decision,
        f"{similarity_score:.4f}" if similarity_score is not None else "n/a",
        f"{normalized_confidence:.1f}",
        f"{liveness_score:.3f}" if liveness_score is not None else "n/a",
        liveness_status,
        flags.face_detected,
        flags.challenge_face_detected,
        flags.multiple_faces,
        flags.low_quality,
        flags.needs_confirmation,
        flags.should_retry,
        flags.matched_profile,
        flags.spoof_suspected,
        reason,
    )


def make_response(
    *,
    profile_id: str,
    decision: str,
    title: str,
    message: str,
    severity: str,
    recommended_ui_action: str,
    flags: DecisionFlags,
    similarity_score: float | None = None,
    normalized_confidence: float = 0.0,
    liveness_score: float | None = None,
    liveness_status: str = "not_checked",
    event_log: list[str] | None = None,
) -> CheckResponse:
    response = CheckResponse(
        decision=decision,
        title=title,
        message=message,
        severity=severity,
        recommended_ui_action=recommended_ui_action,
        similarity_score=round(similarity_score, 4) if similarity_score is not None else None,
        normalized_confidence=normalized_confidence,
        liveness_score=round(liveness_score, 3) if liveness_score is not None else None,
        liveness_status=liveness_status,
        event_log=event_log or [],
        flags=flags,
    )
    log_check_result(
        profile_id=profile_id,
        decision=response.decision,
        similarity_score=response.similarity_score,
        normalized_confidence=response.normalized_confidence,
        liveness_score=response.liveness_score,
        liveness_status=response.liveness_status,
        reason=response.message,
        flags=response.flags,
    )
    return response


# ─── Endpoint ─────────────────────────────────────────────

@router.post(
    "/atm/check",
    response_model=CheckResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
)
async def atm_check(
    file: UploadFile = File(
        ..., description="Кадр с камеры банкомата (JPEG/PNG/WebP, до 10 МБ)"
    ),
    challenge_file: UploadFile | None = File(
        None,
        description="Второй кадр для challenge-response liveness",
    ),
    profile_id: str = Form(
        ...,
        description="ID эталонного профиля из /api/enroll",
    ),
):
    """
    Верификация лица при снятии наличных.

      1. Валидация файла и profile_id
      2. Загрузка эталонного embedding профиля
      3. Детекция лица и извлечение embedding из текущего кадра
      4. Сравнение cosine similarity
      5. Принятие решения по порогам из config
    """
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Профиль `{profile_id}` не найден.",
        )

    reference_embedding = profile.get("embedding")
    if not isinstance(reference_embedding, list) or not reference_embedding:
        raise HTTPException(
            status_code=409,
            detail="У выбранного профиля отсутствует эталонный embedding.",
        )

    # --- 1. Content-type ---
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат: {file.content_type}. "
                   "Разрешены: JPEG, PNG, WebP.",
        )

    if challenge_file and challenge_file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат challenge-файла: {challenge_file.content_type}. "
                   "Разрешены: JPEG, PNG, WebP.",
        )

    # --- 2. Read + size check ---
    contents = await file.read()
    challenge_contents = await challenge_file.read() if challenge_file else None

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой.")

    if len(contents) > MAX_SIZE_BYTES:
        size_mb = len(contents) / 1024 / 1024
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой ({size_mb:.1f} МБ). Максимум: 10 МБ.",
        )

    if challenge_contents and len(challenge_contents) > MAX_SIZE_BYTES:
        size_mb = len(challenge_contents) / 1024 / 1024
        raise HTTPException(
            status_code=413,
            detail=f"Challenge-файл слишком большой ({size_mb:.1f} МБ). Максимум: 10 МБ.",
        )

    # --- 3. Detection + embedding ---
    try:
        result = extract_embedding(contents)
    except FaceError as exc:
        if exc.code == "no_face":
            return make_response(
                profile_id=profile_id,
                decision="delay_and_alert",
                title="Лицо не найдено",
                message="Лицо не найдено в кадре. Попросите клиента посмотреть прямо в камеру.",
                severity="red",
                recommended_ui_action="show_retry_prompt",
                normalized_confidence=0.0,
                liveness_score=0.0,
                liveness_status="not_checked",
                event_log=["Face detection failed: no face"],
                flags=DecisionFlags(
                    face_detected=False,
                    should_retry=True,
                ),
            )

        if exc.code == "multiple_faces":
            return make_response(
                profile_id=profile_id,
                decision="delay_and_alert",
                title="Обнаружено несколько лиц",
                message="В кадре обнаружено несколько лиц. Для проверки должен остаться только один человек.",
                severity="red",
                recommended_ui_action="show_delay_alert",
                normalized_confidence=0.0,
                liveness_score=0.0,
                liveness_status="not_checked",
                event_log=["Face detection failed: multiple faces"],
                flags=DecisionFlags(
                    face_detected=True,
                    multiple_faces=True,
                    should_retry=True,
                ),
            )

        if exc.code == "low_quality":
            return make_response(
                profile_id=profile_id,
                decision="ask_confirmation",
                title="Нужен более качественный кадр",
                message="Лицо найдено, но качество кадра низкое. Нужен повторный кадр или подтверждение операции.",
                severity="yellow",
                recommended_ui_action="show_retry_prompt",
                normalized_confidence=35.0,
                liveness_score=0.0,
                liveness_status="not_checked",
                event_log=["Face detection warning: low quality frame"],
                flags=DecisionFlags(
                    face_detected=True,
                    low_quality=True,
                    needs_confirmation=True,
                    should_retry=True,
                ),
            )

        raise HTTPException(status_code=422, detail=exc.message)
    except Exception:
        logger.exception("ATM face check failed unexpectedly for profile_id=%s", profile_id)
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка при биометрической проверке.",
        )

    if not result.embedding:
        raise HTTPException(
            status_code=422,
            detail="Не удалось извлечь embedding из текущего кадра.",
        )

    # --- 4. Compare embeddings ---
    similarity_score = cosine_similarity(result.embedding, reference_embedding)
    normalized_confidence = normalize_confidence(similarity_score)
    liveness_result = evaluate_liveness(result, challenge_contents)
    thresholds = Thresholds(
        match_allow=settings.THRESHOLD_MATCH,
        match_review=settings.THRESHOLD_UNCERTAIN,
        liveness_pass=settings.LIVENESS_THRESHOLD_PASS,
        liveness_review=settings.LIVENESS_THRESHOLD_REVIEW,
    )
    decision_result = evaluate_decision(
        DecisionInput(
            similarity_score=similarity_score,
            normalized_confidence=normalized_confidence,
            liveness_score=liveness_result.score,
            liveness_status=liveness_result.status,
            face_detected=True,
            challenge_face_detected=liveness_result.challenge_face_detected,
            spoof_suspected=liveness_result.spoof_suspected,
        ),
        thresholds=thresholds,
    )
    flags = DecisionFlags(
        face_detected=True,
        challenge_face_detected=liveness_result.challenge_face_detected,
        needs_confirmation=decision_result.needs_confirmation,
        should_retry=decision_result.should_retry,
        matched_profile=decision_result.matched_profile,
        spoof_suspected=liveness_result.spoof_suspected,
    )

    return make_response(
        profile_id=profile_id,
        decision=decision_result.decision,
        title=decision_result.title,
        message=decision_result.message,
        severity=decision_result.severity,
        recommended_ui_action=decision_result.recommended_ui_action,
        flags=flags,
        similarity_score=similarity_score,
        normalized_confidence=normalized_confidence,
        liveness_score=liveness_result.score,
        liveness_status=liveness_result.status,
        event_log=decision_result.event_log + [f"Liveness reason: {liveness_result.reason}"],
    )
