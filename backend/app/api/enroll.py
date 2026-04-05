"""
POST /api/enroll — регистрация эталонного фото с извлечением embedding.

Пайплайн:
  1. Валидация типа и размера файла
  2. MTCNN → детекция лиц (0 / 1 / N)
  3. InceptionResnetV1 → 512-d embedding
  4. Сохранение файла + профиля (с embedding) в JSON-хранилище
"""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from app.core.storage import save_profile
from app.ml.face_engine import extract_embedding, FaceError

router = APIRouter(tags=["enroll"])

# ─── constants ────────────────────────────────────────────
ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_SIZE_BYTES = 10 * 1024 * 1024   # 10 МБ


# ─── response models ─────────────────────────────────────
class EnrollResponse(BaseModel):
    success: bool
    profile_id: str
    photo_path: str
    message: str
    face_confidence: float | None = None
    embedding_size: int | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    detail: str
    error_code: str | None = None


# ─── endpoint ─────────────────────────────────────────────
@router.post(
    "/enroll",
    response_model=EnrollResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse, "description": "Проблема с лицом на фото"},
    },
)
async def enroll(
    file: UploadFile = File(
        ..., description="Фото лица (JPEG/PNG/WebP, до 10 МБ)"
    ),
):
    """
    Регистрация эталонного фото.

    1. Валидация content-type и размера.
    2. Детекция лица (MTCNN).
    3. Extraction embedding (InceptionResnetV1/vggface2).
    4. Сохранение файла + профиля с embedding в db.json.
    """

    # --- 1. Content-type ---
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат файла: {file.content_type}. "
                   f"Разрешены: JPEG, PNG, WebP.",
        )

    # --- 2. Чтение + размер ---
    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой.")

    if len(contents) > MAX_SIZE_BYTES:
        size_mb = len(contents) / 1024 / 1024
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой ({size_mb:.1f} МБ). Максимум: 10 МБ.",
        )

    # --- 3. Face detection + embedding ---
    try:
        result = extract_embedding(contents)
    except FaceError as e:
        raise HTTPException(
            status_code=422,
            detail=e.message,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка при анализе фото.",
        )

    # --- 4. Сохранение ---
    original_name = file.filename or "photo.jpg"
    profile = save_profile(
        file_bytes=contents,
        original_filename=original_name,
        embedding=result.embedding,
    )

    return EnrollResponse(
        success=True,
        profile_id=profile["id"],
        photo_path=profile["photo_path"],
        message="Эталонное фото сохранено. Лицо распознано.",
        face_confidence=result.confidence,
        embedding_size=len(result.embedding) if result.embedding else None,
    )
