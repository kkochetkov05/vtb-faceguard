"""
Точка входа FastAPI-приложения.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import health, face, enroll, atm


def create_app() -> FastAPI:
    app = FastAPI(
        title="VTB FaceGuard",
        description="Face verification для защиты снятия наличных",
        version="0.1.0",
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Роуты ---
    app.include_router(health.router, prefix="/api", tags=["system"])
    app.include_router(face.router, prefix="/api", tags=["face"])
    app.include_router(enroll.router, prefix="/api", tags=["enroll"])
    app.include_router(atm.router, prefix="/api", tags=["atm"])

    # --- Создаём папку для загрузок ---
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    return app


app = create_app()
