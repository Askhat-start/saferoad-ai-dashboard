# SafeRoad AI

Веб-приложение для безопасной пешеходной маршрутизации по Алматы.
Состоит из двух частей: **фронтенд** (Next.js) и **бэкенд** (Python / Flask с ML-моделью).

---

## Что нужно установить заранее

- [Node.js](https://nodejs.org/) версии 18 или новее
- [Python](https://www.python.org/) версии 3.10 или новее
- Файл модели `risk_model.pkl` (кладётся в `backend/models/`)

---

## Запуск

Нужно запустить **две части** в двух разных терминалах.

### 1. Фронтенд (Next.js)

```bash
# в корне проекта
npm install
npm run dev
```

Откроется на: **http://localhost:3000**

### 2. Бэкенд (Python)

```bash
# во втором терминале
cd backend
pip install -r requirements.txt
python app.py
```

Запустится на: **http://localhost:5000**

> Положи свой файл `risk_model.pkl` в папку `backend/models/` перед запуском.
> Проверить, что бэкенд работает: открой в браузере http://localhost:5000/api/health

### 3. Связать фронтенд с бэкендом

Создай файл `.env.local` в корне проекта со строкой:

```
BACKEND_URL=http://localhost:5000
```

После этого перезапусти фронтенд (`npm run dev`).

---

## Проверка

1. Открой http://localhost:3000
2. Зайди в раздел **Route Planner**
3. Бейдж должен показать **«Live backend»** (а не «Sample data»)

Если бэкенд выключен или модели нет — приложение всё равно работает на встроенном движке, просто без реальной модели.

---

## Возможные проблемы

| Проблема | Решение |
|----------|---------|
| Бейдж показывает «Sample data» | Проверь, что бэкенд запущен и `BACKEND_URL` указан в `.env.local` |
| `modelLoaded: false` в `/api/health` | Файл `risk_model.pkl` отсутствует в `backend/models/` |
| `ModuleNotFoundError` | Не установлены зависимости — выполни `pip install -r requirements.txt` в папке `backend/` |
| Порт 3000 или 5000 занят | Закрой другое приложение на этом порту |
