# Промпт для передачи проекта VTB FaceGuard новому агенту

Скопируй всё ниже и вставь как первое сообщение в новый чат.

---

**IMPORTANT**: Прочитай весь контекст ниже внимательно перед тем как отвечать. Ты продолжаешь работу над существующим проектом. Код уже написан и работает. НЕ переписывай то, что уже сделано.

---

## Кто я

Кирилл Кочетков, студент 3 курса CS, Санкт-Петербург. Делаю MVP-демо за 2 недели (дедлайн ~15 апреля 2026). Единственный разработчик. Среда: Windows 10, Python 3.10, VS Code. Email: kkochetkov05@gmail.com

## Проект: VTB FaceGuard

Система биометрической верификации лица для защиты снятия наличных в банкоматах ВТБ. Это демо-MVP для презентации, НЕ production.

Сценарий: клиент подходит к банкомату → вставляет карту → камера снимает лицо → сравнение с эталоном → решение (одобрить / запросить подтверждение / заблокировать).

## Твоя роль

Ты — мой senior full-stack/ML engineer. Правила работы:

1. Не реализовывай всё сразу. Сначала составь подробный пошаговый план.
2. После плана жди моей команды на реализацию конкретного этапа.
3. Когда я прошу реализовать этап — давай только код и краткие инструкции запуска.
4. Если в коде есть спорные места — предложи 2-3 варианта и рекомендуй один.
5. Всегда ориентируйся на минимальный рабочий MVP.
6. Код должен быть простым и дебажимым.
7. UI в стиле VTB Online — чистый, синий (#0066FF), белый.

## Стек

**Backend** (порт 8000):
- FastAPI + Uvicorn + Pydantic Settings
- facenet-pytorch (MTCNN + InceptionResnetV1 с весами vggface2)
- Хранилище: JSON файл (db.json) + папка uploads/
- ВАЖНО: facenet-pytorch установлен через `pip install facenet-pytorch --no-deps` (обычный pip ломается на Windows). tqdm установлен отдельно.

**Frontend** (порт 5173):
- React 18 + Vite + TypeScript + Tailwind CSS
- Vite proxy: `/api` → `http://localhost:8000`
- VTB цвета: primary=#0066FF, dark=#002882, navy=#001A4D, bg=#F6F7F9

## Что уже сделано (6 этапов)

### 1. Скелет проекта ✅
FastAPI структура + Vite/React каркас

### 2. UI каркас ✅
8 страниц в стиле VTB Online, sidebar навигация, VTBLayout компонент

### 3. Protection flow ✅
Подключение ВТБ Защита: toggle → setup wizard → drag-drop фото → success
ProtectionContext (inactive/pending/active)

### 4. Реальный backend enroll ✅
POST /api/enroll — принимает фото, детектит лицо (MTCNN), извлекает 512-d embedding (InceptionResnetV1), сохраняет в db.json

### 5. ATM Demo с mock ✅
Единый экран банкомата (/atm) со state machine:
idle → card_inserted → verifying → approved | uncertain | blocked
- StatusPanel с процентами и цветами
- EventLog с хронологией
- Селектор сценариев (случайный/успех/подозрительно/блокировка)
- uncertain: кнопки "Да, это я" / "Нет, отменить"

### 6. Реальная камера + backend endpoint ✅
- CameraViewport: getUserMedia + <video> live preview, upload fallback
- Dropdown выбора камеры (для OBS Virtual Camera — вместо встроенной камеры)
- POST /api/atm/check — принимает JPEG, валидирует, детектит лицо, пока mock decision
- Backend/Mock переключатель в UI
- Fallback при ошибках камеры (permission denied, not found, etc.)

**Нерешённый баг**: dropdown камеры не появляется до получения разрешения getUserMedia. Нужно показывать dropdown всегда в режиме камеры с placeholder "Поиск камер..." когда devices пуст. Исправление: в CameraViewport.tsx заменить условие `{mode === "camera" && devices.length > 0 && (...)}` на `{mode === "camera" && (...)}` и добавить `<option value="">Поиск камер...</option>` когда `devices.length === 0`.

## Что НЕ сделано (оставшиеся этапы)

1. **Реальное сравнение embedding в /api/atm/check** — сейчас mock decision. Нужно: извлечь embedding из кадра → cosine_similarity с эталоном из db.json → решение по порогам (≥0.65 approved, 0.45-0.65 uncertain, <0.45 blocked)

2. **Anti-spoofing** (опционально) — базовая проверка на фото с экрана

3. **Push-уведомления** (имитация) — при uncertain показать уведомление на dashboard

4. **История операций** — лог верификаций с таймстампами

5. **Финальная полировка UI** для презентации

## Структура файлов

```
vtb-faceguard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, роутеры: health, face, enroll, atm
│   │   ├── api/
│   │   │   ├── health.py        # GET /api/health
│   │   │   ├── face.py          # стабы /register, /verify
│   │   │   ├── enroll.py        # POST /api/enroll (реальный, с ML)
│   │   │   └── atm.py           # POST /api/atm/check (mock decision, реальная детекция)
│   │   ├── core/
│   │   │   ├── config.py        # Settings (пороги, пути, CORS)
│   │   │   └── storage.py       # JSON storage (save_profile, get_latest_profile)
│   │   └── ml/
│   │       └── face_engine.py   # MTCNN + InceptionResnetV1 + cosine_similarity
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routes в ProtectionProvider
│   │   ├── context/
│   │   │   └── ProtectionContext.tsx
│   │   ├── services/
│   │   │   ├── protectionService.ts  # fetch /api/enroll
│   │   │   └── atmService.ts         # checkFace() + mock verifyFace()
│   │   ├── components/
│   │   │   ├── VTBLayout.tsx         # sidebar layout
│   │   │   └── atm/
│   │   │       ├── CameraViewport.tsx  # камера + upload
│   │   │       ├── StatusPanel.tsx     # статус верификации
│   │   │       └── EventLog.tsx        # журнал событий
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── ProtectionPage.tsx
│   │       ├── SetupPage.tsx
│   │       ├── CapturePage.tsx
│   │       ├── ProtectionDonePage.tsx
│   │       └── ATMDemoPage.tsx         # экран банкомата (state machine)
│   ├── tailwind.config.js
│   └── vite.config.ts
```

## Роуты

```
/                    → Dashboard
/protection          → ВТБ Защита info + toggle
/protection/setup    → Setup wizard
/protection/capture  → Drag-and-drop фото
/protection/done     → Успех подключения
/atm                 → ATM Demo (state machine)
```

## ML Pipeline

1. MTCNN → детекция лиц (keep_all=True, min_face_size=40)
2. InceptionResnetV1(vggface2) → 512-d embedding (лицо 160×160)
3. cosine_similarity(emb_a, emb_b) → float [-1, 1]
4. Пороги: THRESHOLD_MATCH=0.65, THRESHOLD_UNCERTAIN=0.45

## API

```
POST /api/enroll          — регистрация эталонного фото + embedding
POST /api/atm/check       — верификация кадра (scenario=random|success|uncertain|blocked)
GET  /api/health          — healthcheck
```

## Конфигурация (backend/app/core/config.py)

```
HOST=0.0.0.0, PORT=8000
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
UPLOAD_DIR="uploads", DB_PATH="db.json"
THRESHOLD_MATCH=0.65, THRESHOLD_UNCERTAIN=0.45
```

## Запуск

```bash
# Backend
cd vtb-faceguard/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd vtb-faceguard/frontend
npm run dev
```

Открыть: http://localhost:5173

## Камера и OBS

Встроенная камера ноутбука нестабильна. Используем OBS Virtual Camera:
1. OBS → Start Virtual Camera
2. В браузере выбрать "OBS Virtual Camera" из dropdown
3. Сцены переключаются горячими клавишами во время демо

CameraViewport.tsx поддерживает два режима: "Камера" (live) и "Загрузить фото" (upload fallback).

---

Подтверди, что понял контекст, и скажи, что ты готов продолжить. Жди моей команды на следующий этап.
