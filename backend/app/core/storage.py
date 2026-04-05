"""
JSON-хранилище профилей (без БД).

Файл db.json хранит список профилей вида:
[
  {
    "id": "abc123",
    "photo_path": "data/uploads/abc123.jpg",
    "created_at": "2026-04-01T10:00:00",
    "embedding": null            # ← заполнится на этапе ML
  }
]

Потокобезопасность обеспечивается threading.Lock (достаточно для MVP
с uvicorn --workers 1).
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings

_lock = threading.Lock()


def _db_path() -> Path:
    return Path(settings.DB_PATH)


def _read_db() -> list[dict[str, Any]]:
    path = _db_path()
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_db(data: list[dict[str, Any]]) -> None:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _uploads_dir() -> Path:
    """Возвращает абсолютный путь к папке загрузок, создаёт при необходимости."""
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ─── public API ──────────────────────────────────────────

def save_profile(
    file_bytes: bytes,
    original_filename: str,
    embedding: list[float] | None = None,
) -> dict[str, Any]:
    """
    Сохраняет фото на диск и создаёт запись в db.json.

    Возвращает dict профиля:
      { id, photo_path, original_name, created_at, embedding }
    """
    profile_id = uuid.uuid4().hex[:12]

    # Сохраняем с расширением оригинала
    ext = Path(original_filename).suffix.lower() or ".jpg"
    filename = f"{profile_id}{ext}"
    dest = _uploads_dir() / filename
    dest.write_bytes(file_bytes)

    profile = {
        "id": profile_id,
        "photo_path": str(dest).replace("\\", "/"),   # Windows-safe
        "original_name": original_filename,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "embedding": embedding,
    }

    with _lock:
        db = _read_db()
        db.append(profile)
        _write_db(db)

    return profile


def get_latest_profile() -> dict[str, Any] | None:
    """Возвращает последний зарегистрированный профиль (или None)."""
    db = _read_db()
    return db[-1] if db else None


def get_profile(profile_id: str) -> dict[str, Any] | None:
    """Ищет профиль по id."""
    for p in _read_db():
        if p["id"] == profile_id:
            return p
    return None
