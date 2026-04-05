"""
Face verification API — заглушки.
Реальная логика будет на следующих этапах.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/face", tags=["face"])


@router.post("/register")
async def register_face():
    """Регистрация эталонного лица — TODO."""
    return {"message": "not implemented yet"}


@router.post("/verify")
async def verify_face():
    """Верификация лица — TODO."""
    return {"message": "not implemented yet"}
