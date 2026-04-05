"""
Продуктовый decision engine для ATM verification.

В одном месте объединяет:
  - match score
  - liveness score / status
  - итоговый продуктовый сценарий

Файл специально сделан простым и калибруемым перед демо.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Thresholds:
    match_allow: float = 0.65
    match_review: float = 0.45
    liveness_pass: float = 0.42
    liveness_review: float = 0.22


@dataclass
class DecisionInput:
    similarity_score: float
    normalized_confidence: float
    liveness_score: float | None
    liveness_status: str
    face_detected: bool = True
    challenge_face_detected: bool = False
    multiple_faces: bool = False
    low_quality: bool = False
    spoof_suspected: bool = False


@dataclass
class ProductDecision:
    decision: str
    title: str
    message: str
    severity: str
    recommended_ui_action: str
    event_log: list[str] = field(default_factory=list)
    needs_confirmation: bool = False
    should_retry: bool = False
    matched_profile: bool = False


def evaluate_decision(data: DecisionInput, thresholds: Thresholds) -> ProductDecision:
    events: list[str] = []
    events.append(f"Match score: {data.similarity_score:.3f}")
    events.append(f"Normalized confidence: {data.normalized_confidence:.1f}")
    events.append(
        "Liveness: "
        f"{data.liveness_status}"
        + (
            f" ({data.liveness_score:.3f})"
            if data.liveness_score is not None
            else " (n/a)"
        )
    )

    if data.multiple_faces:
        events.append("Risk rule triggered: multiple faces in frame")
        return ProductDecision(
            decision="delay_and_alert",
            title="Обнаружено несколько лиц",
            message="Для безопасной проверки перед камерой должен находиться только один человек.",
            severity="red",
            recommended_ui_action="show_delay_alert",
            event_log=events,
            should_retry=True,
        )

    if data.low_quality:
        events.append("Review rule triggered: low quality frame")
        return ProductDecision(
            decision="ask_confirmation",
            title="Нужен более качественный кадр",
            message="Лицо найдено, но качество кадра недостаточно. Попросите пользователя посмотреть прямо в камеру.",
            severity="yellow",
            recommended_ui_action="show_retry_prompt",
            event_log=events,
            needs_confirmation=True,
            should_retry=True,
        )

    if data.liveness_status in {"failed", "not_checked"}:
        events.append("Red rule triggered: liveness failed or not checked")
        return ProductDecision(
            decision="delay_and_alert",
            title="Подозрение на подмену",
            message="Проверка живого присутствия не пройдена. Операцию нужно задержать и показать предупреждение.",
            severity="red",
            recommended_ui_action="show_delay_alert",
            event_log=events,
            should_retry=True,
        )

    if data.spoof_suspected and data.liveness_status == "suspicious":
        events.append("Yellow rule triggered: suspicious liveness")
        return ProductDecision(
            decision="ask_confirmation",
            title="Нужна дополнительная проверка",
            message="Проверка живого присутствия неубедительна. Попросите пользователя повторить движение или подтвердить операцию.",
            severity="yellow",
            recommended_ui_action="show_retry_prompt",
            event_log=events,
            needs_confirmation=True,
            should_retry=True,
        )

    if data.similarity_score >= thresholds.match_allow and data.liveness_status == "passed":
        events.append("Green rule triggered: strong match + passed liveness")
        return ProductDecision(
            decision="allow",
            title="Операция разрешена",
            message="Лицо совпало с эталоном, проверка живого присутствия пройдена.",
            severity="green",
            recommended_ui_action="proceed_cash_withdrawal",
            event_log=events,
            matched_profile=True,
        )

    if data.similarity_score >= thresholds.match_review:
        events.append("Yellow rule triggered: borderline match")
        return ProductDecision(
            decision="ask_confirmation",
            title="Нужно подтверждение клиента",
            message="Совпадение частичное. Разрешите клиенту подтвердить операцию вручную.",
            severity="yellow",
            recommended_ui_action="show_confirmation_prompt",
            event_log=events,
            needs_confirmation=True,
            should_retry=True,
        )

    events.append("Red rule triggered: low match score")
    return ProductDecision(
        decision="delay_and_alert",
        title="Операция задержана",
        message="Лицо не совпадает с эталоном. Операцию нужно задержать и показать предупреждение.",
        severity="red",
        recommended_ui_action="show_delay_alert",
        event_log=events,
        should_retry=True,
    )
