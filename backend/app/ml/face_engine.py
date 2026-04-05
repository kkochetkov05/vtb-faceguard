"""
Face detection + embedding extraction (facenet-pytorch).

Пайплайн:
  1. MTCNN → детекция лиц, bounding boxes, probabilities
  2. InceptionResnetV1(vggface2) → 512-d embedding

Этот же модуль будет использоваться при verify:
  cosine_similarity(emb_ref, emb_new) → score
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

# ─── Lazy singleton ──────────────────────────────────────
# Модели грузятся один раз при первом вызове, потом переиспользуются.

_mtcnn: MTCNN | None = None
_resnet: InceptionResnetV1 | None = None


def _get_mtcnn() -> MTCNN:
    global _mtcnn
    if _mtcnn is None:
        _mtcnn = MTCNN(
            image_size=160,
            margin=20,
            keep_all=True,       # вернуть ВСЕ найденные лица
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            post_process=True,   # нормализация [-1, 1]
            device="cpu",
        )
    return _mtcnn


def _get_resnet() -> InceptionResnetV1:
    global _resnet
    if _resnet is None:
        _resnet = InceptionResnetV1(
            pretrained="vggface2",
            classify=False,
            device="cpu",
        ).eval()
    return _resnet


# ─── Result types ────────────────────────────────────────

@dataclass
class FaceResult:
    """Результат анализа одного изображения."""
    face_count: int
    embedding: list[float] | None   # 512-d, только если face_count == 1
    box: list[float] | None         # [x1, y1, x2, y2] bounding box
    confidence: float | None        # вероятность от MTCNN
    landmarks: list[list[float]] | None = None  # 5-point landmarks


class FaceError(Exception):
    """Ошибки, связанные с детекцией лиц."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


# ─── Public API ──────────────────────────────────────────

def extract_embedding(image_bytes: bytes) -> FaceResult:
    """
    Основной метод: принимает байты изображения, возвращает FaceResult.

    Raises FaceError:
      - code="no_face"        → лицо не найдено
      - code="multiple_faces" → найдено > 1 лица
      - code="low_quality"    → лицо найдено, но confidence слишком низкая
    """
    # Открываем изображение
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise FaceError("bad_image", "Не удалось прочитать изображение.")

    mtcnn = _get_mtcnn()
    resnet = _get_resnet()

    # ── Детекция ──
    boxes, probs, landmarks = mtcnn.detect(img, landmarks=True)

    # Нет лиц
    if boxes is None or len(boxes) == 0:
        raise FaceError(
            "no_face",
            "Лицо не обнаружено на фото. Убедитесь, что лицо хорошо видно и освещено.",
        )

    # Несколько лиц
    if len(boxes) > 1:
        raise FaceError(
            "multiple_faces",
            f"Обнаружено {len(boxes)} лиц. На фото должно быть только одно лицо.",
        )

    # Одно лицо — проверяем confidence
    confidence = float(probs[0])
    if confidence < 0.90:
        raise FaceError(
            "low_quality",
            f"Качество фото недостаточное (уверенность: {confidence:.0%}). "
            "Попробуйте сделать фото при лучшем освещении.",
        )

    # ── Embedding extraction ──
    # Получаем выровненное лицо 160×160 (одно)
    face_tensor = mtcnn(img)            # shape: [N, 3, 160, 160]

    if face_tensor is None or face_tensor.shape[0] == 0:
        raise FaceError(
            "no_face",
            "Не удалось выделить лицо из изображения.",
        )

    single_face = face_tensor[0].unsqueeze(0)   # [1, 3, 160, 160]

    with torch.no_grad():
        emb = resnet(single_face)                # [1, 512]

    embedding = emb.squeeze().tolist()            # list[float] len=512

    box = boxes[0].tolist()                       # [x1, y1, x2, y2]
    face_landmarks = landmarks[0].tolist() if landmarks is not None else None

    return FaceResult(
        face_count=1,
        embedding=embedding,
        box=box,
        confidence=confidence,
        landmarks=face_landmarks,
    )


def cosine_similarity(emb_a: list[float], emb_b: list[float]) -> float:
    """
    Косинусное сходство двух embedding-ов.
    Будет использоваться при verify.
    Возвращает float от -1 до 1 (>0.65 обычно = тот же человек).
    """
    a = np.array(emb_a, dtype=np.float32)
    b = np.array(emb_b, dtype=np.float32)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
