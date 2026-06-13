"""
predict.py
----------
Prediction interface for SafeRoad AI. Loads your trained risk_model.pkl
DYNAMICALLY and returns a risk score 0–100 + band for a road segment.
"""

import joblib
import pandas as pd
from pathlib import Path
from typing import Any

# ── Model path (drop your .pkl into backend/models/) ──────────────────────────
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "risk_model.pkl"

# ── Expected input features (must match training order) ───────────────────────
FEATURE_COLUMNS = [
    "speedLimit", "lanes",
    "crosswalk", "trafficLight",
    "schoolNearby", "busStopNearby",
    "lighting", "sidewalkQuality",
]

# Cache the loaded pipeline so we don't hit disk on every request.
_PIPELINE = None


def _load_model(model_path: Path = DEFAULT_MODEL_PATH):
    """Load (and cache) the trained pipeline from disk."""
    global _PIPELINE
    if _PIPELINE is None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Drop your trained risk_model.pkl into backend/models/."
            )
        _PIPELINE = joblib.load(model_path)
    return _PIPELINE


def _assign_band(score: float) -> str:
    """Convert a continuous risk score to a categorical band."""
    if score < 50:
        return "Low"
    elif score < 80:
        return "Medium"
    return "High"


def predict_risk(
    input_data: dict[str, Any],
    model_path: Path = DEFAULT_MODEL_PATH,
) -> dict[str, Any]:
    """
    Predict the risk score for a single road segment.

    input_data keys: speedLimit, lanes, crosswalk, trafficLight,
                     schoolNearby, busStopNearby, lighting, sidewalkQuality
    Returns: { riskScore: float (0–100), riskBand: "Low"|"Medium"|"High" }
    """
    pipeline = _load_model(model_path)

    # Build a single-row DataFrame in the correct column order
    row = {col: [input_data[col]] for col in FEATURE_COLUMNS}
    X = pd.DataFrame(row)

    score = float(round(pipeline.predict(X)[0], 2))
    score = max(0.0, min(100.0, score))  # safety clamp

    return {"riskScore": score, "riskBand": _assign_band(score)}


def predict_batch(
    records: list[dict[str, Any]],
    model_path: Path = DEFAULT_MODEL_PATH,
) -> list[dict[str, Any]]:
    """Predict risk scores for multiple road segments at once."""
    pipeline = _load_model(model_path)
    X = pd.DataFrame([{c: r[c] for c in FEATURE_COLUMNS} for r in records])
    scores = pipeline.predict(X)
    return [
        {
            "riskScore": float(round(max(0, min(100, s)), 2)),
            "riskBand": _assign_band(float(s)),
        }
        for s in scores
    ]


if __name__ == "__main__":
    sample = {
        "speedLimit": 60, "lanes": 4, "crosswalk": 0, "trafficLight": 1,
        "schoolNearby": 0, "busStopNearby": 1, "lighting": "poor",
        "sidewalkQuality": "medium",
    }
    result = predict_risk(sample)
    print("── Prediction result ──────────────────────")
    print(f"  Risk Score : {result['riskScore']}")
    print(f"  Risk Band  : {result['riskBand']}")
    print("───────────────────────────────────────────")
