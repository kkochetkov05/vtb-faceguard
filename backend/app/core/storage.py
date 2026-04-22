"""
SQLite-хранилище профилей для MVP.

Фото продолжают храниться на диске, а SQLite хранит:
  - profile_id
  - путь к фото
  - original filename
  - created_at
  - embedding как JSON-строку

Решение рассчитано на простой многопользовательский сценарий:
  - отдельное sqlite-соединение на каждую операцию
  - WAL mode и busy_timeout для конкурентных запросов
  - без ORM и без большого архитектурного слоя
"""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings

_init_lock = threading.Lock()
_initialized = False


def _sqlite_path() -> Path:
    return Path(settings.SQLITE_PATH)


def _legacy_json_path() -> Path:
    return Path(settings.LEGACY_DB_JSON_PATH)


def _uploads_dir() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    db_path = _sqlite_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(
        db_path,
        timeout=30,
        check_same_thread=False,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def _create_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            photo_path TEXT NOT NULL,
            original_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            embedding_json TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_profiles_created_at
        ON profiles(created_at DESC)
        """
    )
    conn.commit()


def _import_legacy_json_if_needed(conn: sqlite3.Connection) -> None:
    legacy_path = _legacy_json_path()
    if not legacy_path.exists():
        return

    existing_rows = conn.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
    if existing_rows:
        return

    with legacy_path.open("r", encoding="utf-8") as file:
        legacy_profiles = json.load(file)

    if not isinstance(legacy_profiles, list) or not legacy_profiles:
        return

    conn.executemany(
        """
        INSERT OR IGNORE INTO profiles (
            id,
            photo_path,
            original_name,
            created_at,
            embedding_json
        ) VALUES (?, ?, ?, ?, ?)
        """,
        [
            (
                profile["id"],
                profile["photo_path"],
                profile.get("original_name") or Path(profile["photo_path"]).name,
                profile.get("created_at") or datetime.now().isoformat(timespec="seconds"),
                json.dumps(profile.get("embedding")) if profile.get("embedding") is not None else None,
            )
            for profile in legacy_profiles
        ],
    )
    conn.commit()


def init_storage() -> None:
    global _initialized

    if _initialized:
        return

    with _init_lock:
        if _initialized:
            return

        _uploads_dir()
        with _connect() as conn:
            _create_schema(conn)
            _import_legacy_json_if_needed(conn)
        _initialized = True


def _row_to_profile(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    embedding_raw = row["embedding_json"]
    embedding = json.loads(embedding_raw) if embedding_raw else None

    return {
        "id": row["id"],
        "photo_path": row["photo_path"],
        "original_name": row["original_name"],
        "created_at": row["created_at"],
        "embedding": embedding,
    }


def save_profile(
    file_bytes: bytes,
    original_filename: str,
    embedding: list[float] | None = None,
) -> dict[str, Any]:
    """
    Сохраняет фото на диск и создаёт профиль в SQLite.

    Возвращает dict профиля:
      { id, photo_path, original_name, created_at, embedding }
    """
    init_storage()

    profile_id = uuid.uuid4().hex[:12]
    ext = Path(original_filename).suffix.lower() or ".jpg"
    filename = f"{profile_id}{ext}"
    destination = _uploads_dir() / filename
    destination.write_bytes(file_bytes)

    profile = {
        "id": profile_id,
        "photo_path": str(destination).replace("\\", "/"),
        "original_name": original_filename,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "embedding": embedding,
    }

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO profiles (
                id,
                photo_path,
                original_name,
                created_at,
                embedding_json
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                profile["id"],
                profile["photo_path"],
                profile["original_name"],
                profile["created_at"],
                json.dumps(profile["embedding"]) if profile["embedding"] is not None else None,
            ),
        )
        conn.commit()

    return profile


def get_latest_profile() -> dict[str, Any] | None:
    """Возвращает последний зарегистрированный профиль."""
    init_storage()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, photo_path, original_name, created_at, embedding_json
            FROM profiles
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()
    return _row_to_profile(row)


def get_profile(profile_id: str) -> dict[str, Any] | None:
    """Ищет профиль по id."""
    init_storage()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, photo_path, original_name, created_at, embedding_json
            FROM profiles
            WHERE id = ?
            LIMIT 1
            """,
            (profile_id,),
        ).fetchone()
    return _row_to_profile(row)
