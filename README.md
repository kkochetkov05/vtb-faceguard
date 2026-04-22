# VTB FaceGuard

Демо/MVP продукта для дополнительной защиты снятия наличных по карте.

Идея продукта:
- клиент в интерфейсе, похожем на ВТБ Онлайн, добровольно подключает защиту;
- сохраняет эталонное фото лица;
- при снятии наличных банкомат сверяет лицо у камеры с эталоном;
- система учитывает face match, liveness и product rules;
- по итогам выбирается один из сценариев:
  - `allow`
  - `ask_confirmation`
  - `delay_and_alert`

## Текущее состояние проекта

Сейчас в репозитории уже реализован рабочий demo flow:

- frontend c VTB-style интерфейсом:
  - dashboard,
  - экран подключения защиты,
  - экран сохранения эталонного фото,
  - success screen,
  - ATM demo page;
- backend на FastAPI с реальными endpoint'ами:
  - `POST /api/enroll`
  - `POST /api/atm/check`
- ML/CV слой для:
  - face detection,
  - face embedding extraction,
  - cosine similarity,
  - liveness challenge-response;
- product decision engine, который возвращает:
  - `decision`,
  - `title`,
  - `message`,
  - `severity`,
  - `recommended_ui_action`,
  - scores / flags / event log.

Отдельно в проекте есть deterministic demo presets для ATM UI, чтобы презентацию можно было провести стабильно даже без live-камеры.

## Основной пользовательский flow

### 1. Protection flow

1. Пользователь открывает экран `ВТБ Защита`
2. Включает дополнительную защиту переключателем
3. Сразу попадает на экран сохранения фото
4. Может:
   - загрузить файл,
   - сделать фото с камеры устройства
5. Фото уходит в `POST /api/enroll`
6. Backend извлекает embedding и сохраняет профиль
7. После успешной загрузки пользователь попадает на экран `Защита подключена`

### 2. ATM demo flow

1. Пользователь открывает экран `/atm`
2. Камера ноутбука играет роль камеры банкомата
3. По нажатию `Приложить карту` frontend отправляет кадр на `POST /api/atm/check`
4. Backend:
   - детектит лицо,
   - проверяет liveness,
   - сравнивает embedding с эталоном,
   - запускает decision engine
5. UI показывает один из сценариев:
   - зелёный: операция разрешена
   - жёлтый: требуется подтверждение владельца
   - красный: операция задержана / alert

## Структура проекта

```text
vtb-faceguard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── atm.py
│   │   │   ├── enroll.py
│   │   │   ├── face.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── storage.py
│   │   ├── ml/
│   │   │   └── face_engine.py
│   │   ├── services/
│   │   │   ├── decision_engine.py
│   │   │   └── liveness.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── data/
│   │   └── faceguard.sqlite3
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── atm/
│   │   │   ├── protection/
│   │   │   └── ui/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── vtb-faceguard-demo-overview.html
├── vtb-faceguard-effort-estimate.html
├── vtb-faceguard-architecture-explainer.html
└── README.md
```

## Техническая архитектура

High-level схема:

```text
Camera / Uploaded Image
        ↓
Frontend (React / Vite)
        ↓
Backend API (FastAPI)
        ↓
ML Layer (face detection + embedding + liveness)
        ↓
Decision Engine
        ↓
Storage (profiles, embeddings, photo paths)
```

### Frontend

Ключевые части:

- [`frontend/src/pages/ProtectionPage.tsx`](frontend/src/pages/ProtectionPage.tsx)
  экран подключения защиты
- [`frontend/src/pages/CapturePage.tsx`](frontend/src/pages/CapturePage.tsx)
  сохранение эталонного фото из файла или камеры
- [`frontend/src/components/protection/ReferenceCameraCapture.tsx`](frontend/src/components/protection/ReferenceCameraCapture.tsx)
  захват фото с камеры устройства
- [`frontend/src/pages/ATMPage.tsx`](frontend/src/pages/ATMPage.tsx)
  основной ATM demo flow
- [`frontend/src/components/atm/CameraViewport.tsx`](frontend/src/components/atm/CameraViewport.tsx)
  ATM camera / upload fallback
- [`frontend/src/context/ProtectionContext.tsx`](frontend/src/context/ProtectionContext.tsx)
  хранит состояние защиты, preview и `profileId`

### Backend

Ключевые части:

- [`backend/app/api/enroll.py`](backend/app/api/enroll.py)
  принимает эталонное фото, извлекает embedding, сохраняет профиль
- [`backend/app/api/atm.py`](backend/app/api/atm.py)
  принимает ATM-кадры, запускает face verification + liveness + decision engine
- [`backend/app/ml/face_engine.py`](backend/app/ml/face_engine.py)
  face detection, landmarks, embedding extraction, similarity
- [`backend/app/services/liveness.py`](backend/app/services/liveness.py)
  challenge-response liveness для MVP
- [`backend/app/services/decision_engine.py`](backend/app/services/decision_engine.py)
  product logic и финальное решение
- [`backend/app/core/storage.py`](backend/app/core/storage.py)
  локальное SQLite-хранилище профилей через `sqlite3`

## API

### `POST /api/enroll`

Назначение:
- сохранить эталонное фото пользователя;
- извлечь embedding;
- создать профиль.

Ожидает:
- `multipart/form-data`
- поле `file`

Возвращает:
- `success`
- `profile_id`
- `photo_path`
- `message`
- `face_confidence`
- `embedding_size`

### `POST /api/atm/check`

Назначение:
- проверить лицо в ATM-сценарии;
- оценить liveness;
- вернуть product decision.

Ожидает:
- `multipart/form-data`
- поле `file`
- optional `challenge_file`
- поле `profile_id`

Возвращает:
- `decision`
- `title`
- `message`
- `severity`
- `recommended_ui_action`
- `similarity_score`
- `normalized_confidence`
- `liveness_score`
- `liveness_status`
- `event_log`
- `flags`

## Decision logic

В проекте используется единый decision engine.

Итоговые продуктовые сценарии:

- `allow`
  лицо совпало с эталоном, liveness пройден
- `ask_confirmation`
  match пограничный или ситуация спорная, нужен step-up сценарий
- `delay_and_alert`
  сильное несовпадение, провал liveness или высокий spoof-risk

Пороговые значения сейчас лежат в:
- [`backend/app/core/config.py`](backend/app/core/config.py)

Текущие demo thresholds:
- `THRESHOLD_MATCH = 0.65`
- `THRESHOLD_UNCERTAIN = 0.45`
- `LIVENESS_THRESHOLD_PASS = 0.42`
- `LIVENESS_THRESHOLD_REVIEW = 0.22`

## Стек

| Слой | Стек |
|------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | FastAPI, Uvicorn, Pydantic Settings, python-multipart |
| CV / ML | PyTorch, facenet-pytorch, MTCNN, InceptionResnetV1, Pillow, NumPy |
| UI / Demo | Lucide React, local camera capture, upload fallback |

## Локальный запуск

## 1. Backend

Рекомендуемая версия Python: `3.10.x`

```bash
cd backend

# Создать виртуальное окружение
python3.10 -m venv .venv

# Активировать (Linux / WSL / macOS)
source .venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Скопировать env
cp .env.example .env

# При необходимости поменять путь до SQLite
# SQLITE_PATH=data/faceguard.sqlite3

# Запустить backend
uvicorn app.main:app --reload --port 8000
```

Swagger UI:
- `http://localhost:8000/docs`

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:
- `http://localhost:5173`

Vite proxy уже настроен:
- все запросы на `/api/*` проксируются на `http://localhost:8000`

## 3. Production build frontend

```bash
cd frontend
npm run build
```

## Обновление продакшена

Если проект задеплоен на сервере в `/opt/vtb-faceguard`, можно использовать
скрипт [`scripts/deploy_prod.sh`](/projects/vtb-faceguard/scripts/deploy_prod.sh).

Подготовка на сервере:

```bash
cd /opt/vtb-faceguard
chmod +x scripts/deploy_prod.sh
```

Обычное обновление:

```bash
cd /opt/vtb-faceguard
./scripts/deploy_prod.sh
```

Полезные варианты:

```bash
./scripts/deploy_prod.sh --frontend-only
./scripts/deploy_prod.sh --backend-only
./scripts/deploy_prod.sh --skip-backend-deps
./scripts/deploy_prod.sh --skip-frontend-deps
./scripts/deploy_prod.sh --no-backup
```

По умолчанию скрипт:
- делает `git pull --ff-only`;
- сохраняет резервные копии SQLite-базы и `backend/uploads`;
- обновляет backend и перезапускает `systemd`-сервис `vtb-faceguard`;
- пересобирает frontend и публикует его в `/var/www/vtb-faceguard`;
- показывает последние логи backend-сервиса.

## Demo presets

На ATM-странице есть два режима показа:

- live backend flow
- deterministic demo presets

Preset-сценарии:
- `Реальная проверка`
- `Успешная операция`
- `Требуется подтверждение`
- `Подозрительная операция`

Это сделано специально, чтобы demo можно было провести стабильно даже если камера, свет или live liveness ведут себя нестабильно.

## Что уже реально работает

- реальная загрузка эталонного фото в backend;
- сохранение `profile_id` и preview во frontend context;
- возможность сделать эталонное фото прямо с камеры;
- ATM page подключена к реальному `/api/atm/check`;
- face verification по embedding;
- liveness challenge-response для MVP;
- event log и product scenarios на ATM-экране;
- step-up сценарий `Это вы?` на frontend;
- быстрый переход к demo presets для презентации.

## Ограничения текущего MVP

- storage локальный, на SQLite;
- `enableProtection` / `disableProtection` во frontend service пока mock;
- `face.py` содержит заготовки, но не является основой текущего flow;
- liveness в MVP эвристический и чувствителен к камере/освещению;
- ATM demo не интегрирован с реальным железом банкомата;
- часть legacy ATM-страниц (`/atm/success`, `/atm/uncertain`, `/atm/blocked`) ещё лежит в проекте как старый flow.

## Полезные HTML-страницы в корне

В корне проекта уже лежат standalone explainers:

- [`vtb-faceguard-demo-overview.html`](vtb-faceguard-demo-overview.html)
  краткий обзор demo-продукта
- [`vtb-faceguard-effort-estimate.html`](vtb-faceguard-effort-estimate.html)
  оценка команды и человеко-часов
- [`vtb-faceguard-architecture-explainer.html`](vtb-faceguard-architecture-explainer.html)
  explainability / architecture page

Их можно открыть локально двойным кликом по файлу.

## Что логично делать дальше

- доработать liveness до более устойчивого anti-spoof сценария;
- убрать legacy ATM flow и оставить один основной;
- вынести demo presets / mocks в более явный demo config;
- добавить реальные backend endpoints для включения/отключения защиты;
- усилить storage, event history и банковые интеграции.
