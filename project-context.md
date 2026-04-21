# VTB FaceGuard — Project Context

## 1. Что это за проект

**VTB FaceGuard** — demo/MVP продукта для дополнительной защиты снятия наличных по карте.

Идея:
- клиент в интерфейсе, похожем на ВТБ Онлайн, добровольно подключает дополнительную защиту;
- сохраняет эталонное фото лица;
- при снятии наличных система сравнивает лицо у камеры банкомата с эталоном;
- дополнительно учитываются `liveness` и продуктовые правила;
- на выходе выбирается один из сценариев:
  - `allow`
  - `ask_confirmation`
  - `delay_and_alert`

Проект сделан как **демо с рабочим full flow**, а не как production-ready банковая система.

---

## 2. Текущее git-состояние

На момент составления этого файла локальный репозиторий находится в таком состоянии:

- ветка: `main`
- текущий commit: `c8ac75e`
- сообщение commit: `sldlm,f`

Важно:
- локальная ветка была **жёстко откатана** до `c8ac75e`;
- ранее был commit с render/deploy-изменениями (`dc745b7`), но локально от него **ушли reset'ом**;
- по предыдущей проверке локальная ветка была `behind 1` относительно `origin/main`.

То есть новый агент должен учитывать, что:
- **локальное состояние и удалённый `origin/main` могут отличаться**;
- render/deploy-слой в текущем локальном состоянии **отсутствует**.

---

## 3. Главный пользовательский сценарий

### Protection flow

Текущий flow:
1. Пользователь открывает экран `ВТБ Защита`
2. Включает защиту переключателем
3. Сразу переходит на экран захвата эталонного фото
4. Может:
   - загрузить файл
   - сделать фото с камеры устройства
5. Фото уходит в backend на `POST /api/enroll`
6. Backend извлекает embedding и сохраняет профиль
7. После успешной загрузки пользователь попадает на success screen

### ATM demo flow

Текущий flow:
1. Пользователь открывает `/atm`
2. Камера ноутбука играет роль ATM-камеры
3. На странице есть режимы:
   - live backend
   - deterministic demo presets
4. При нажатии `Приложить карту` frontend отправляет кадр на `POST /api/atm/check`
5. Backend:
   - ищет лицо
   - извлекает embedding
   - делает liveness challenge-response
   - запускает decision engine
6. UI показывает один из сценариев:
   - зелёный
   - жёлтый с подтверждением
   - красный с задержкой/alert

---

## 4. Что реально реализовано

### Frontend

Реально есть:
- dashboard page
- protection page
- capture page
- done page
- ATM demo page
- отдельный camera capture для эталонного фото
- camera/upload fallback на ATM-экране
- demo presets для презентации
- ask-confirmation flow (`Да, это я` / `Нет, это не я`)
- event timeline
- liveness retry flow

### Backend

Реально есть:
- `POST /api/enroll`
- `POST /api/atm/check`
- face detection
- embedding extraction
- cosine similarity
- challenge-response liveness
- decision engine
- JSON storage профилей

### Что ещё не production-grade

- toggle protection (`enableProtection` / `disableProtection`) во frontend пока mock
- storage локальное: `db.json` + папка фото
- backend не подготовлен под production deployment в текущем commit
- реального банковского интеграционного слоя нет

---

## 5. Архитектура

Высокоуровнево:

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

Стек:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React

Ключевые файлы:
- `frontend/src/App.tsx`
- `frontend/src/context/ProtectionContext.tsx`
- `frontend/src/pages/ProtectionPage.tsx`
- `frontend/src/pages/CapturePage.tsx`
- `frontend/src/pages/ProtectionDonePage.tsx`
- `frontend/src/pages/ATMPage.tsx`
- `frontend/src/components/protection/ReferenceCameraCapture.tsx`
- `frontend/src/components/atm/CameraViewport.tsx`
- `frontend/src/services/protectionService.ts`
- `frontend/src/services/atmService.ts`

### Backend

Стек:
- Python
- FastAPI
- Uvicorn
- Pydantic Settings
- python-multipart
- PyTorch
- facenet-pytorch
- MTCNN
- InceptionResnetV1
- Pillow
- NumPy

Ключевые файлы:
- `backend/app/main.py`
- `backend/app/api/enroll.py`
- `backend/app/api/atm.py`
- `backend/app/api/face.py`
- `backend/app/api/health.py`
- `backend/app/core/config.py`
- `backend/app/core/storage.py`
- `backend/app/ml/face_engine.py`
- `backend/app/services/liveness.py`
- `backend/app/services/decision_engine.py`

---

## 6. Текущий frontend-контекст

### Routes

В `frontend/src/App.tsx`:

- `/` — dashboard
- `/protection` — экран защиты
- `/protection/setup` — редирект на `/protection/capture`
- `/protection/capture` — загрузка / фото с камеры
- `/protection/done` — success screen
- `/atm` — основной ATM demo flow
- `/atm/success`
- `/atm/uncertain`
- `/atm/blocked`

### ProtectionContext

`frontend/src/context/ProtectionContext.tsx` хранит:
- `status`
- `referencePhoto`
- `activatedAt`
- `profileId`
- async status для toggle/upload

Важный смысл:
- `profileId` приходит из backend после `POST /api/enroll`
- именно этот `profileId` потом использует ATM flow

### Capture page

На текущем коммите пользователь может:
- выбрать файл
- сделать фото с камеры

Ключевой компонент:
- `frontend/src/components/protection/ReferenceCameraCapture.tsx`

Особенности:
- камера уже отзеркалена через `transform: scaleX(-1)`
- aspect ratio у камеры ближе к ATM-формату
- можно выбрать устройство камеры

### ATM page

`frontend/src/pages/ATMPage.tsx` — один из самых насыщенных по логике файлов.

Там есть:
- live mode
- demo presets:
  - `live`
  - `happy`
  - `fraud`
  - `review`
- event log
- result summary
- ask-confirmation UI
- liveness retry flow

Ключевые детали:
- есть стартовый экран
- есть правая колонка с выбором сценария
- есть кнопка `Сбросить сценарий`
- live-режим использует глобальный `window.__vtb_getFrame`, который отдаёт кадр из `CameraViewport`

---

## 7. Текущий backend-контекст

### `POST /api/enroll`

Файл:
- `backend/app/api/enroll.py`

Что делает:
1. проверяет тип файла
2. проверяет размер
3. вызывает `extract_embedding`
4. сохраняет профиль через `save_profile`
5. возвращает:
   - `success`
   - `profile_id`
   - `photo_path`
   - `message`
   - `face_confidence`
   - `embedding_size`

### `POST /api/atm/check`

Файл:
- `backend/app/api/atm.py`

Что делает:
1. принимает основной кадр
2. опционально принимает challenge frame
3. ищет профиль по `profile_id`
4. извлекает embedding из текущего кадра
5. считает similarity
6. считает liveness
7. запускает decision engine
8. возвращает:
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

### Decision engine

Файл:
- `backend/app/services/decision_engine.py`

Продуктовые сценарии:
- `allow`
- `ask_confirmation`
- `delay_and_alert`

### Thresholds

Файл:
- `backend/app/core/config.py`

Текущие значения:
- `THRESHOLD_MATCH = 0.65`
- `THRESHOLD_UNCERTAIN = 0.45`
- `LIVENESS_THRESHOLD_PASS = 0.42`
- `LIVENESS_THRESHOLD_REVIEW = 0.22`

### Storage

Файл:
- `backend/app/core/storage.py`

Что важно:
- storage локальное
- используется `db.json`
- фото сохраняются в `uploads/`
- это MVP-решение, без БД

---

## 8. Что важно знать про deployment

На текущем локальном commit:
- **нет render-конфига**
- **нет Dockerfile**
- **нет монолитного deployment-слоя**
- frontend всё ещё ходит в backend по относительным `/api/...`
- в dev это работает через Vite proxy

То есть:
- локально проект рассчитан на запуск как `frontend + backend` по отдельности
- production/deploy работа была начата позже, но **сейчас откатана**

Если новый агент будет снова заниматься деплоем, нужно помнить:
- локальный commit `c8ac75e` — это состояние **до render-эксперимента**
- любые deployment-решения надо делать заново от этого состояния

---

## 9. Известные продуктовые особенности и компромиссы

### Что хорошо подходит для demo

- сильный ATM UI
- deterministic presets
- понятная продуктовая логика
- ask-confirmation flow
- event timeline
- camera capture для эталонного фото

### Что всё ещё хрупко

- live liveness зависит от камеры, света и положения головы
- backend хранит всё локально
- toggle protection пока не связан с реальным backend endpoint
- deployment не завершён

### Что уже было сделано и потом откатилось

Была попытка подготовить:
- Render deployment
- Docker deployment
- single-service runtime

Но это было **откачено**, и сейчас репозиторий снова в более раннем состоянии.

---

## 10. Локальный запуск

### Backend

Рекомендуемый Python:
- `3.10.x`

Команды:

```bash
cd /projects/vtb-faceguard/backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Адрес:
- `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd /projects/vtb-faceguard/frontend
npm install
npm run dev
```

Адрес:
- `http://localhost:5173`

Важно:
- Vite proxy проксирует `/api/*` на `http://localhost:8000`

---

## 11. Полезные артефакты в корне проекта

В корне есть дополнительные explain/demo-файлы:
- `README.md`
- `vtb-faceguard-handoff-prompt.md`
- `vtb-faceguard-demo-overview.html`
- `vtb-faceguard-effort-estimate.html`
- `vtb-faceguard-architecture-explainer.html`
- `faceguard-tech.html`
- split-файлы для отдельных слайдов, если они присутствуют в рабочем дереве

Новый агент должен проверять их актуальность относительно текущего commit, потому что часть из них могла редактироваться отдельно от основного продукта.

---

## 12. Что, вероятно, логично делать дальше

С точки зрения продукта и demo, наиболее логичные следующие шаги:

1. Определиться, на каком git-состоянии продолжается работа:
   - локальный `c8ac75e`
   - или удалённый `origin/main`

2. Если нужен deploy:
   - заново выбрать deployment strategy
   - не опираться на откатанные render-изменения как на существующее состояние

3. Если нужен product/UI polish:
   - продолжать от текущего ATM demo flow
   - аккуратно не ломать preset-режимы

4. Если нужен backend polish:
   - доводить decision engine
   - улучшать liveness
   - улучшать хранение данных и конфиг

5. Если нужен handoff в новый чат:
   - передавать именно этот файл
   - отдельно указывать текущий commit и расхождение с `origin/main`

---

## 13. Краткое резюме для нового чата

Если нужно передать контекст совсем коротко:

- это demo/MVP сервиса защиты снятия наличных по лицу;
- клиент сохраняет эталонное фото;
- ATM flow сравнивает лицо, проверяет liveness и запускает decision engine;
- есть working frontend + backend + ML pipeline;
- есть сильный demo UI с presets и ask-confirmation;
- текущий локальный репозиторий откатан до `c8ac75e`;
- deployment-правки на Render/Docker в текущем локальном состоянии отсутствуют;
- перед продолжением работы важно помнить, что `origin/main` может быть на другом commit.
