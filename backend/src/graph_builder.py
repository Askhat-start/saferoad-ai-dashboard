"""
graph_builder.py
----------------
Builds a realistic road graph for central Almaty, Kazakhstan.
Uses a synthetic grid + diagonal arterials based on Almaty's actual
street layout (UTM-aligned grid, Alatau mountains to the south).

The trained scikit-learn pipeline (your risk_model.pkl) is loaded
DYNAMICALLY from MODEL_PATH and used to score every edge — so the graph's
risk values come straight from your real model.

In production: replace _build() with an osmnx call.
"""

import pickle
import random
import math
from pathlib import Path

import numpy as np
import networkx as nx
import pandas as pd
import joblib

# ── Paths (relative to the backend/ folder) ──────────────────────────────────
BASE       = Path(__file__).resolve().parent.parent          # backend/
MODEL_PATH = BASE / "models" / "risk_model.pkl"              # <-- drop your .pkl here
CACHE_PATH = BASE / "cache" / "almaty_graph.pkl"             # auto-generated

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── Almaty bounding box (central area) ───────────────────────────────────────
# Real coords: lat 43.20–43.27, lng 76.84–76.96
LAT_MIN, LAT_MAX = 43.200, 43.275
LNG_MIN, LNG_MAX = 76.840, 76.960

# Grid resolution: ~30 columns × 20 rows ≈ 600 intersections
COLS, ROWS = 30, 20

FEATURE_COLUMNS = [
    "speedLimit", "lanes", "crosswalk", "trafficLight",
    "schoolNearby", "busStopNearby", "lighting", "sidewalkQuality",
]


def _grid_pos(col: int, row: int) -> tuple[float, float]:
    """Convert grid (col, row) to (lat, lng)."""
    lat = LAT_MIN + (row / (ROWS - 1)) * (LAT_MAX - LAT_MIN)
    lng = LNG_MIN + (col / (COLS - 1)) * (LNG_MAX - LNG_MIN)
    return lat, lng


def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Distance in metres between two lat/lng points."""
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _highway_type(col: int, row: int) -> str:
    """Assign OSM-like highway type based on position in the grid."""
    # Almaty has major E-W boulevards every ~5 rows and N-S avenues every ~5 cols
    if row % 5 == 0:
        return "primary"
    if col % 5 == 0:
        return "secondary"
    if row % 2 == 0:
        return "tertiary"
    return "residential"


def _edge_features(highway: str, col: int, row: int) -> dict:
    """Generate realistic infrastructure features for an edge."""
    rng = random.Random((col * 1000 + row) ^ 0xABCD)

    speed_map = {"primary": 60, "secondary": 50, "tertiary": 40, "residential": 30}
    lane_map  = {"primary": rng.choice([3, 4]), "secondary": rng.choice([2, 3]),
                 "tertiary": 2, "residential": 1}

    speed = speed_map.get(highway, 50) + rng.randint(-5, 5)
    speed = max(30, min(80, speed))
    lanes = lane_map.get(highway, 2)

    is_major = highway in ("primary", "secondary")
    crosswalk       = 0 if (is_major and rng.random() < 0.5) else rng.randint(0, 1)
    traffic_light   = 1 if (is_major and rng.random() < 0.75) else rng.randint(0, 1)
    school_nearby   = 1 if rng.random() < 0.12 else 0
    bus_stop_nearby = 1 if rng.random() < (0.4 if is_major else 0.2) else 0
    lighting        = "good" if rng.random() < 0.6 else "poor"
    sidewalk_opts   = (["good", "medium"] if is_major else ["good", "medium", "poor"])
    sidewalk_qual   = rng.choice(sidewalk_opts)

    return {
        "highway":         highway,
        "speedLimit":      speed,
        "lanes":           lanes,
        "crosswalk":       crosswalk,
        "trafficLight":    traffic_light,
        "schoolNearby":    school_nearby,
        "busStopNearby":   bus_stop_nearby,
        "lighting":        lighting,
        "sidewalkQuality": sidewalk_qual,
    }


def _load_model():
    """Load the trained pipeline (your risk_model.pkl) from disk."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}.\n"
            "Drop your trained risk_model.pkl into backend/models/ and restart."
        )
    return joblib.load(MODEL_PATH)


def _build() -> nx.MultiDiGraph:
    G = nx.MultiDiGraph()

    # ── Add nodes (intersections) ─────────────────────────────────────────────
    for row in range(ROWS):
        for col in range(COLS):
            node_id = row * COLS + col
            lat, lng = _grid_pos(col, row)
            G.add_node(node_id, y=lat, x=lng)

    # ── Add edges (streets) ───────────────────────────────────────────────────
    pipeline = _load_model()
    records, edge_keys = [], []

    def add_edge(u, v, col, row):
        lat1, lng1 = _grid_pos(col, row)
        highway = _highway_type(col, row)
        feats   = _edge_features(highway, col, row)
        length  = _haversine(lat1, lng1, G.nodes[v]["y"], G.nodes[v]["x"])
        records.append(feats)
        edge_keys.append((u, v, feats, length))

    for row in range(ROWS):
        for col in range(COLS):
            u = row * COLS + col
            # Horizontal (E-W)
            if col + 1 < COLS:
                v = row * COLS + (col + 1)
                add_edge(u, v, col, row)
                add_edge(v, u, col + 1, row)
            # Vertical (N-S)
            if row + 1 < ROWS:
                v = (row + 1) * COLS + col
                add_edge(u, v, col, row)
                add_edge(v, u, col, row + 1)

    # Score ALL edges at once with the real model
    df     = pd.DataFrame([{k: r[k] for k in FEATURE_COLUMNS} for r in records])
    scores = np.clip(pipeline.predict(df), 0, 100)

    for (u, v, feats, length), score in zip(edge_keys, scores):
        band = "Low" if score < 50 else ("Medium" if score < 80 else "High")
        G.add_edge(u, v,
                   length=length,
                   riskScore=round(float(score), 2),
                   riskBand=band,
                   speed_kph=feats["speedLimit"],
                   **{k: feats[k] for k in FEATURE_COLUMNS})

    print(f"[graph] Built Almaty graph: {G.number_of_nodes()} nodes, "
          f"{G.number_of_edges()} edges (scored by risk_model.pkl)")
    return G


def build_graph(force_rebuild: bool = False) -> nx.MultiDiGraph:
    if CACHE_PATH.exists() and not force_rebuild:
        print("[graph] Loading cached graph …")
        with open(CACHE_PATH, "rb") as f:
            return pickle.load(f)

    G = _build()
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "wb") as f:
        pickle.dump(G, f)
    print(f"[graph] Cached → {CACHE_PATH}")
    return G


if __name__ == "__main__":
    G = build_graph(force_rebuild=True)
    for u, v, d in list(G.edges(data=True))[:2]:
        print(f"  {u}->{v}: risk={d['riskScore']} band={d['riskBand']} speed={d['speed_kph']}")
