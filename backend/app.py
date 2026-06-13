"""
app.py — SafeRoad AI Flask backend
==================================
Serves the three endpoints the SafeRoad AI frontend expects. The graph is
built once at startup and every edge is scored by YOUR trained model
(backend/models/risk_model.pkl), so all data is dynamic and model-driven.

Endpoints (the Next.js proxy forwards /api/saferoad/* -> /api/* here):
    GET  /api/health        -> { status, nodes, edges }
    POST /api/route         -> colored GeoJSON route + summary
                               body: { origin:[lat,lng], destination:[lat,lng], alpha:0..1 }
    POST /api/predict-risk  -> { riskScore, riskBand }
                               body: single road-segment feature dict

Run:
    cd backend
    pip install -r requirements.txt
    # put your model at backend/models/risk_model.pkl
    python app.py            # serves http://localhost:5000
Then set BACKEND_URL=http://localhost:5000 in the v0 project env vars.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from src.graph_builder import build_graph
from src.router import find_route
from src.predict import predict_risk

app = Flask(__name__)
CORS(app)  # harmless; the Next.js proxy already makes calls same-origin

# Build (or load cached) graph once at startup.
print("[app] Building Almaty road graph and scoring with risk_model.pkl …")
GRAPH = build_graph()
print(f"[app] Ready: {GRAPH.number_of_nodes()} nodes, {GRAPH.number_of_edges()} edges")


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "engine": "flask+sklearn",
        "nodes": GRAPH.number_of_nodes(),
        "edges": GRAPH.number_of_edges(),
    })


@app.post("/api/route")
def route():
    data = request.get_json(force=True) or {}
    origin = data.get("origin")
    destination = data.get("destination")
    alpha = float(data.get("alpha", 0.5))

    if not (isinstance(origin, (list, tuple)) and isinstance(destination, (list, tuple))):
        return jsonify({"error": "bad_request",
                        "message": "origin and destination must be [lat, lng]."}), 400

    try:
        result = find_route(GRAPH, tuple(origin[:2]), tuple(destination[:2]), alpha)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": "no_route", "message": str(e)}), 422


@app.post("/api/predict-risk")
def api_predict_risk():
    data = request.get_json(force=True) or {}
    try:
        return jsonify(predict_risk(data))
    except KeyError as e:
        return jsonify({"error": "bad_request",
                        "message": f"Missing feature: {e}"}), 400


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
