# SafeRoad AI — Pedestrian Safety Intelligence Platform

SafeRoad AI is a smart-city decision platform for **Almaty, Kazakhstan** that scores
pedestrian risk across the road network, computes risk-aware walking routes, explains
*why* a street is dangerous, and helps city planners spend an infrastructure budget where
it saves the most lives.

The project has two parts:

| Part | Stack | Purpose |
| --- | --- | --- |
| **Frontend** | Next.js (App Router) + React + Tailwind + Leaflet + Recharts | Dashboard, map, route planner, explainability, upgrade planner |
| **Backend** | Python + Flask + scikit-learn | Loads the trained `.pkl` risk model, builds the city graph, runs the router |

> The frontend works **on its own** using a built-in TypeScript fallback engine.
> Connecting the Python backend swaps in your **real trained model** for predictions and routing.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Quick Start](#quick-start)
5. [Frontend Setup](#frontend-setup)
6. [Backend Setup](#backend-setup)
7. [Connecting Frontend and Backend](#connecting-frontend-and-backend)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Features

- **City Dashboard** — overall safety score, dangerous segments, risk trends, district breakdown.
- **Route Planner** — pick start/end on the map, adjust a **risk-sensitivity slider** (Fastest ⇄ Safest), and compare routes.
- **Explainable AI** — click any road segment to see a SHAP-style breakdown of its risk factors, and re-score it live with the model.
- **City Upgrade Planner** — set a budget and get an optimized list of infrastructure upgrades with ROI and a before/after safety simulation.
- **Graceful fallback** — if the Python model is offline, the app keeps working on a built-in engine so demos never break.

---

## Architecture

```
┌─────────────────────────┐        HTTP         ┌──────────────────────────┐
│   Next.js Frontend       │  /api/saferoad/*    │   Next.js Proxy Route    │
│  (map, charts, sliders)  │ ──────────────────▶ │  app/api/saferoad/[...]  │
└─────────────────────────┘                      └────────────┬─────────────┘
                                                               │ if BACKEND_URL is set
                                                               ▼
                                                  ┌──────────────────────────┐
                                                  │   Python Flask Backend   │
                                                  │  graph + router + model  │
                                                  │   risk_model.pkl (yours) │
                                                  └──────────────────────────┘
```

- The frontend never calls the Python server directly. It calls its **own** `/api/saferoad/*` route.
- That route **forwards** to `BACKEND_URL` when it is set, otherwise it answers using the built-in TypeScript engine.
- This avoids CORS/mixed-content issues and keeps the app functional with or without the backend.

---

## Project Structure

```
.
├── app/
│   ├── api/saferoad/[...path]/route.ts   # Proxy → Python backend (or fallback engine)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/saferoad/                   # Dashboard, map, route, explain, upgrade modules
├── lib/
│   ├── api.ts                             # Typed client used by the UI
│   ├── city-data.ts                       # Synthetic Almaty dataset (fallback + demo)
│   └── server/                            # Built-in TS engine (graph, router, risk model)
└── backend/
    ├── app.py                             # Flask server (/api/health, /api/route, /api/predict-risk)
    ├── requirements.txt
    ├── models/
    │   └── risk_model.pkl                 # ◀ YOU add this (not committed to git)
    └── src/
        ├── graph_builder.py
        ├── router.py
        └── predict.py
```

---

## Quick Start

```bash
# 1. Clone
git clone <your-repo-url>
cd saferoad-ai-dashboard

# 2. Frontend
npm install
npm run dev          # http://localhost:3000
```

That alone gives you a fully working app (fallback engine).
To use the **real model**, also run the backend below and set `BACKEND_URL`.

---

## Frontend Setup

**Requirements:** Node.js 18+ and npm (or pnpm/yarn).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |

---

## Backend Setup

**Requirements:** Python 3.10+ and pip.

```bash
cd backend

# (recommended) create a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### Add your model

Place your trained scikit-learn model here:

```
backend/models/risk_model.pkl
```

> The `.pkl` is **not** included in the repository (large binaries should not live in git).
> Each developer must supply their own. If the file is missing, the backend reports
> `modelLoaded: false` and uses heuristic scoring instead.

If your file has a different name, point to it with an env var:

```bash
export MODEL_PATH=models/my_model.pkl     # Windows: set MODEL_PATH=models\my_model.pkl
```

### Run the server

```bash
python app.py        # http://localhost:5000
```

Verify it:

```bash
curl http://localhost:5000/api/health
# { "status": "ok", "modelLoaded": true, "nodes": 600, "edges": 2300 }
```

---

## Connecting Frontend and Backend

Tell the frontend where the Python server lives.

**Local development** — create `.env.local` in the project root:

```bash
BACKEND_URL=http://localhost:5000
```

Restart `npm run dev`. In the app, the **Route Planner** badge should change from
`Sample data` to `Live backend`.

**On v0 / Vercel** — add `BACKEND_URL` in **Project Settings → Environment Variables**
(in v0: top-right settings → **Vars**).

---

## Environment Variables

| Variable | Where | Required | Description |
| --- | --- | --- | --- |
| `BACKEND_URL` | Frontend | No | Base URL of the Python backend (e.g. `http://localhost:5000`). If unset, the built-in engine is used. |
| `MODEL_PATH` | Backend | No | Path to the `.pkl` model. Defaults to `models/risk_model.pkl`. |
| `PORT` | Backend | No | Port for Flask. Defaults to `5000`. |

---

## API Reference

All endpoints are served by the Python backend and proxied through the frontend at
`/api/saferoad/*`.

### `GET /api/health`

Returns server and model status.

```json
{ "status": "ok", "modelLoaded": true, "nodes": 600, "edges": 2300 }
```

### `POST /api/route`

Computes a risk-aware route.

**Request**

```json
{
  "origin": [43.205, 76.85],
  "destination": [43.27, 76.95],
  "alpha": 0.7
}
```

| Field | Type | Description |
| --- | --- | --- |
| `origin` | `[lat, lng]` | Start coordinate |
| `destination` | `[lat, lng]` | End coordinate |
| `alpha` | `0.0–1.0` | Risk sensitivity. `0` = fastest, `1` = safest |

**Response** — a colored GeoJSON `FeatureCollection` plus summary fields
(`totalDistance`, `totalTime`, `totalRisk`, `riskBand`).

### `POST /api/predict-risk`

Scores a single road segment.

**Request**

```json
{
  "speedLimit": 60,
  "lanes": 4,
  "crosswalk": 0,
  "trafficLight": 1,
  "schoolNearby": 0,
  "busStopNearby": 1,
  "lighting": "poor",
  "sidewalkQuality": "medium"
}
```

**Response**

```json
{ "riskScore": 73.4, "riskBand": "high" }
```

---

## Deployment

**Frontend → Vercel**

- Push to GitHub and import the repo in Vercel (or click **Publish** in v0).
- Set `BACKEND_URL` in the Vercel project's environment variables.

**Backend → Railway / Render / any host that runs Python**

1. Deploy the `backend/` folder.
2. Make sure `risk_model.pkl` is available on the host (upload it, or load from object storage).
3. Copy the public URL (e.g. `https://saferoad-api.up.railway.app`).
4. Set `BACKEND_URL` to that URL in the frontend's environment variables.

> A deployed frontend **cannot** reach a backend running on your `localhost`.
> For a fully public demo, the backend must be hosted too.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Badge stays on `Sample data` | `BACKEND_URL` not set or server down | Set `BACKEND_URL`, restart dev server, confirm `/api/health` |
| `modelLoaded: false` | `.pkl` missing or wrong path | Put the model in `backend/models/risk_model.pkl` or set `MODEL_PATH` |
| `ModuleNotFoundError` | Dependencies not installed | Run `pip install -r requirements.txt` inside `backend/` |
| Published site can't reach backend | Backend on localhost | Host the backend and point `BACKEND_URL` at its public URL |
| CORS / mixed-content errors | Calling Python server directly | Always call the frontend `/api/saferoad/*` proxy, not the Python URL |

---

## License

Built with [v0](https://v0.app). Use freely for your hackathon or project.
