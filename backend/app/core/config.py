"""
Конфигурация приложения.
Все настройки читаются из переменных окружения / .env файла.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Сервер ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # --- Пути ---
    UPLOAD_DIR: str = "uploads"
    DB_PATH: str = "db.json"

    # --- ML пороги (будут использоваться позже) ---
    THRESHOLD_MATCH: float = 0.65
    THRESHOLD_UNCERTAIN: float = 0.45
    ENABLE_ANTISPOOF: bool = True
    LIVENESS_THRESHOLD_PASS: float = 0.42
    LIVENESS_THRESHOLD_REVIEW: float = 0.22

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
