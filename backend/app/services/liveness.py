"""
Простой challenge-response liveness layer для demo MVP.

Ключевая идея:
  - liveness должен опираться не на сдвиг всего изображения,
    а на изменение геометрии лица между кадрами
  - если пользователь слегка поворачивает голову, landmarks меняются
  - если двигают телефон с фото, рамка лица может сместиться, но
    относительная геометрия landmarks почти не меняется
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt

from app.ml.face_engine import FaceError, FaceResult, extract_embedding


@dataclass
class LivenessResult:
    score: float
    status: str  # passed | suspicious | failed | not_checked
    reason: str
    challenge_face_detected: bool
    should_retry: bool = False
    spoof_suspected: bool = False


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _face_center(box: list[float]) -> tuple[float, float]:
    x1, y1, x2, y2 = box
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _face_size(box: list[float]) -> tuple[float, float]:
    x1, y1, x2, y2 = box
    return (max(x2 - x1, 1.0), max(y2 - y1, 1.0))


def _center_shift(primary: FaceResult, challenge: FaceResult) -> float:
    if not primary.box or not challenge.box:
        return 0.0

    cx1, cy1 = _face_center(primary.box)
    cx2, cy2 = _face_center(challenge.box)
    w1, h1 = _face_size(primary.box)
    w2, h2 = _face_size(challenge.box)

    center_distance = sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2)
    reference_size = max((w1 + h1 + w2 + h2) / 4.0, 1.0)
    normalized_shift = center_distance / (reference_size * 0.20)

    return _clamp(normalized_shift, 0.0, 1.0)


def _pose_signature(landmarks: list[list[float]]) -> tuple[float, float]:
    left_eye, right_eye, nose, mouth_left, mouth_right = landmarks
    eye_dx = max(right_eye[0] - left_eye[0], 1.0)
    mouth_center_x = (mouth_left[0] + mouth_right[0]) / 2.0
    eye_center_x = (left_eye[0] + right_eye[0]) / 2.0

    nose_balance = (nose[0] - left_eye[0]) / eye_dx
    mouth_balance = (mouth_center_x - left_eye[0]) / eye_dx

    return (nose_balance, mouth_balance)


def _pose_change_score(primary: FaceResult, challenge: FaceResult) -> float:
    if not primary.landmarks or not challenge.landmarks:
        return 0.0

    primary_nose, primary_mouth = _pose_signature(primary.landmarks)
    challenge_nose, challenge_mouth = _pose_signature(challenge.landmarks)

    nose_delta = abs(challenge_nose - primary_nose)
    mouth_delta = abs(challenge_mouth - primary_mouth)

    raw_delta = (nose_delta * 0.75) + (mouth_delta * 0.25)
    return _clamp(raw_delta / 0.10, 0.0, 1.0)


def evaluate_liveness(
    primary_result: FaceResult,
    challenge_bytes: bytes | None,
) -> LivenessResult:
    if not challenge_bytes:
        return LivenessResult(
            score=0.0,
            status="not_checked",
            reason="Проверка живости не выполнена: второй кадр не получен.",
            challenge_face_detected=False,
            should_retry=True,
        )

    try:
        challenge_result = extract_embedding(challenge_bytes)
    except FaceError as exc:
        reason_map = {
            "no_face": "Во втором кадре лицо не найдено. Повторите движение перед камерой.",
            "multiple_faces": "Во втором кадре найдено несколько лиц. Для challenge должен остаться один человек.",
            "low_quality": "Второй кадр слишком некачественный для проверки живости.",
        }
        return LivenessResult(
            score=0.0,
            status="failed",
            reason=reason_map.get(exc.code, exc.message),
            challenge_face_detected=False,
            should_retry=True,
            spoof_suspected=True,
        )

    pose_change = _pose_change_score(primary_result, challenge_result)
    center_shift = _center_shift(primary_result, challenge_result)
    score = round(pose_change, 3)

    if center_shift >= 0.35 and pose_change < 0.20:
        return LivenessResult(
            score=score,
            status="failed",
            reason="Похоже, перед камерой двигали фото или экран: лицо сместилось, но геометрия почти не изменилась.",
            challenge_face_detected=True,
            should_retry=True,
            spoof_suspected=True,
        )

    if score >= 0.42:
        return LivenessResult(
            score=score,
            status="passed",
            reason="Проверка живости пройдена: геометрия лица заметно изменилась между кадрами.",
            challenge_face_detected=True,
        )

    if score >= 0.22:
        return LivenessResult(
            score=score,
            status="suspicious",
            reason="Проверка живости неубедительна. Поверните голову чуть сильнее и повторите challenge.",
            challenge_face_detected=True,
            should_retry=True,
            spoof_suspected=True,
        )

    return LivenessResult(
        score=score,
        status="failed",
        reason="Проверка живости не пройдена: пользователь не выполнил поворот головы или перед камерой показано статичное фото.",
        challenge_face_detected=True,
        should_retry=True,
        spoof_suspected=True,
    )
