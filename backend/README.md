# SafeRoad AI — Python Backend

Flask service that powers the SafeRoad AI frontend with **your real trained
model**. The Almaty road graph is built once and every edge is scored by
`models/risk_model.pkl`, so routes and risk scores are fully dynamic.

## 1. Add your model

Place your trained scikit-learn pipeline here:

```
backend/models/risk_model.pkl
```

(See `models/PUT_YOUR_MODEL_HERE.txt` for the expected feature schema.)

## 2. Install & run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
python app.py        # -> http://localhost:5000
```

First start builds + caches the graph (`backend/cache/almaty_graph.pkl`).
Delete that file to force a rebuild after swapping the model.

For production, use gunicorn:

```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

## 3. Connect the frontend

The Next.js app talks to this server through its built-in proxy. Just set one
environment variable in the v0 project (Settings → Vars):

```
BACKEND_URL=http://localhost:5000
```

or, once deployed to Railway / Render:

```
BACKEND_URL=https://your-app.up.railway.app
```

That's it — the frontend automatically forwards `/api/route`,
`/api/predict-risk`, and `/api/health` to your Flask server. If the server is
ever unreachable, the app falls back to its built-in engine so a demo never
breaks.

## Endpoints

| Method | Path                | Body                                             | Returns                         |
| ------ | ------------------- | ------------------------------------------------ | ------------------------------- |
| GET    | `/api/health`       | —                                                | `{ status, nodes, edges }`      |
| POST   | `/api/route`        | `{ origin:[lat,lng], destination:[lat,lng], alpha }` | colored GeoJSON + summary   |
| POST   | `/api/predict-risk` | segment feature dict                             | `{ riskScore, riskBand }`       |

## Deploying to Railway / Render (5 min)

1. Push this `backend/` folder to a Git repo.
2. New service → point at the repo.
3. Start command: `gunicorn -w 2 -b 0.0.0.0:$PORT app:app`
4. Make sure `risk_model.pkl` is committed (or uploaded) into `models/`.
5. Copy the public URL into `BACKEND_URL` in the v0 project.
