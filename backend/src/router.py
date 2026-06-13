"""
router.py — Risk-aware routing for SafeRoad AI
alpha=0.0 → fastest route   alpha=1.0 → safest route

Routes over the Almaty graph whose edges were scored by your risk_model.pkl,
so the safety/speed trade-off reflects the real model.
"""

import numpy as np
import networkx as nx
from typing import Any


def _nearest_node(G: nx.MultiDiGraph, lat: float, lng: float) -> int:
    """Find the graph node closest to (lat, lng)."""
    best_node, best_dist = None, float("inf")
    for node, data in G.nodes(data=True):
        d = (data["y"] - lat) ** 2 + (data["x"] - lng) ** 2
        if d < best_dist:
            best_dist, best_node = d, node
    return best_node


def _travel_time(data: dict) -> float:
    length = data.get("length", 100)
    speed = float(data.get("speed_kph", data.get("speedLimit", 50)))
    speed = max(10.0, speed)
    return max(1.0, (length / 1000.0) / speed * 3600.0)


def _combined_cost(data: dict, alpha: float) -> float:
    time_norm = _travel_time(data) / 30.0 * 50.0
    risk = data.get("riskScore", 50.0)
    return (1.0 - alpha) * time_norm + alpha * risk


def find_route(
    G: nx.MultiDiGraph,
    origin_latlon: tuple[float, float],
    dest_latlon: tuple[float, float],
    alpha: float = 0.5,
) -> dict[str, Any]:
    alpha = max(0.0, min(1.0, float(alpha)))

    orig_node = _nearest_node(G, *origin_latlon)
    dest_node = _nearest_node(G, *dest_latlon)

    if orig_node == dest_node:
        raise ValueError("Origin and destination resolve to the same point.")

    # Set combined cost weights
    for u, v, k, data in G.edges(keys=True, data=True):
        G[u][v][k]["_cost"] = _combined_cost(data, alpha)

    try:
        path_nodes = nx.shortest_path(G, orig_node, dest_node, weight="_cost")
    except nx.NetworkXNoPath:
        raise ValueError("No path found between selected points.")

    features, risks, total_time, total_dist = [], [], 0.0, 0.0

    for i in range(len(path_nodes) - 1):
        u, v = path_nodes[i], path_nodes[i + 1]
        edge_data = min(G[u][v].values(), key=lambda d: d.get("_cost", 9999))

        coords = [
            [G.nodes[u]["x"], G.nodes[u]["y"]],
            [G.nodes[v]["x"], G.nodes[v]["y"]],
        ]

        risk  = edge_data.get("riskScore", 50.0)
        band  = edge_data.get("riskBand", "Medium")
        dist  = edge_data.get("length", 100.0)
        ttime = _travel_time(edge_data)

        risks.append(risk)
        total_time += ttime
        total_dist += dist

        # Color each leg by its risk band so the map renders it directly.
        color = "#16a34a" if risk < 50 else ("#ca8a04" if risk < 80 else "#dc2626")

        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "riskScore": risk,
                "riskBand": band,
                "length": round(dist, 1),
                "color": color,
            },
        })

    avg_risk = float(np.mean(risks)) if risks else 50.0
    band = "Low" if avg_risk < 50 else ("Medium" if avg_risk < 80 else "High")

    return {
        "geojson":       {"type": "FeatureCollection", "features": features},
        "totalRisk":     round(avg_risk, 1),
        "totalTime":     round(total_time),
        "totalDistance": round(total_dist),
        "riskBand":      band,
        "nodeCount":     len(path_nodes),
        "alpha":         alpha,
        # Mirror fields under the names the frontend normalizer also accepts:
        "riskScore":     round(avg_risk, 1),
        "distance":      round(total_dist),
        "duration":      round(total_time),
    }
