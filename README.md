# SafeRoad AI — Инструкция по запуску

Проект состоит из двух частей:

- **Frontend** — Next.js приложение (карта, маршруты, аналитика)
- **Backend** — Python (Flask), который загружает ML-модель `risk_model.pkl`

Необходимо запустить обе части.

---

## Что нужно установить заранее

- **Node.js** 18+ — https://nodejs.org
- **Python** 3.10+ — https://python.org
- **Git** — https://git-scm.com

---

## 1. Скачать проект

```bash
git clone <ссылка-на-репозиторий>
cd <папка-проекта>
```

---

## 2. Запустить Frontend (терминал №1)

```bash
npm install
npm run dev
```

Откроется на: **http://localhost:3000**

---

## 3. Запустить Backend (терминал №2)

```bash
cd backend
pip install -r requirements.txt
```

Поместите свою модель сюда:

```
backend/models/risk_model.pkl
```

Запустите сервер:

```bash
python app.py
```

Откроется на: **http://localhost:5000**

Проверка:

```bash
curl http://localhost:5000/api/health
```

Если в ответе `"modelLoaded": true` — модель загрузилась успешно.

---

## 4. Связать Frontend и Backend

В корне проекта создайте файл **`.env.local`**:

```
BACKEND_URL=http://localhost:5000
```

Перезапустите frontend (`Ctrl+C`, затем снова `npm run dev`).

---

## 5. Проверить

Откройте http://localhost:3000 — раздел **Route Planner**.
Бейдж должен показывать **"Live backend"** (а не "Sample data").

---

## Возможные проблемы

| Проблема | Решение |
|---|---|
| Бейдж показывает "Sample data" | Проверьте, что backend запущен и `BACKEND_URL` указан в `.env.local`, перезапустите frontend |
| `modelLoaded: false` | Файл `risk_model.pkl` лежит не в `backend/models/` или назван иначе |
| Порт 3000 / 5000 занят | Закройте другой процесс или смените порт |

> Если backend выключен — приложение всё равно работает на встроенном движке (без реальной модели), демо не сломается.
