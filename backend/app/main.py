"""
Точка входа FastAPI-приложения.
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.storage import init_storage
from app.api import health, face, enroll, atm


def _frontend_dist_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend-dist"


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
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
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
    init_storage()

    frontend_dist = _frontend_dist_dir()
    if frontend_dist.exists():
        @app.get("/", include_in_schema=False)
        async def serve_frontend_index() -> FileResponse:
            return FileResponse(frontend_dist / "index.html")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_frontend_app(full_path: str) -> FileResponse:
            if full_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not found")

            requested_path = frontend_dist / full_path
            if full_path and requested_path.is_file():
                return FileResponse(requested_path)

            index_file = frontend_dist / "index.html"
            if index_file.exists():
                return FileResponse(index_file)

            raise HTTPException(status_code=404, detail="Frontend build not found")

    return app


app = create_app()
