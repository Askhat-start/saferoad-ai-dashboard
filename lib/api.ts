/**
 * SafeRoad AI — frontend client for the Flask backend.
 *
 * Backend contract (app.py):
 *   GET  /api/health        -> { status, nodes, edges }
 *   POST /api/route         -> colored GeoJSON route
 *                              body: { origin:[lat,lng], destination:[lat,lng], alpha:0..1 }
 *   POST /api/predict-risk  -> { riskScore, riskBand }
 *                              body: single road-segment feature dict
 *
 * All calls go through the same-origin Next.js proxy at /api/saferoad/*
 * (see app/api/saferoad/[...path]/route.ts) which forwards to BACKEND_URL.
 * This avoids CORS and HTTPS->HTTP mixed-content problems during a demo.
 *
 * Every call degrades gracefully: if the backend is unreachable we fall back
 * to the synthetic Almaty dataset so the UI keeps working.
 */

import {
  FASTEST_ROUTE,
  ROUTE_COMPARISON,
  SAFEROAD_ROUTE,
  riskLevel,
  type LatLng,
  type RiskLevel,
} from './city-data'

const PROXY_BASE = '/api/saferoad'

/* ---------- Minimal GeoJSON typing (no extra deps) ---------- */

export interface GeoJsonFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString' | 'MultiLineString'
    coordinates: number[][] | number[][][]
  }
  properties?: Record<string, unknown>
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

/* ---------- Normalized shapes the UI consumes ---------- */

export interface RouteLeg {
  /** ordered [lat,lng] points for this leg */
  positions: LatLng[]
  /** stroke color (from backend properties, or derived from risk) */
  color: string
  /** 0..100 risk for this leg if provided */
  risk?: number
}

export interface RouteSummary {
  distanceKm: number
  durationMin: number
  riskScore: number
  riskBand: RiskLevel
  highRiskSegments: number
}

export interface RouteResult {
  legs: RouteLeg[]
  summary: RouteSummary
  /** raw backend payload for debugging / future use */
  raw: unknown
  /** whether the data came from the live backend or the local fallback */
  source: 'backend' | 'fallback'
}

export interface PredictRiskResult {
  riskScore: number
  riskBand: RiskLevel
  source: 'backend' | 'fallback'
}

export interface HealthResult {
  status: string
  nodes?: number
  edges?: number
  online: boolean
}

/* ---------- Color helpers ---------- */

const RISK_HEX: Record<RiskLevel, string> = {
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#dc2626',
}

function colorForRisk(risk: number | undefined): string {
  if (risk == null) return '#2563eb'
  return RISK_HEX[riskLevel(risk)]
}

function bandFromString(value: unknown, score: number): RiskLevel {
  const s = String(value ?? '').toLowerCase()
  if (s.includes('high')) return 'high'
  if (s.includes('med')) return 'medium'
  if (s.includes('low')) return 'low'
  return riskLevel(score)
}

/* ---------- GeoJSON -> RouteLeg[] adapter ---------- */

function lineToPositions(coords: number[][]): LatLng[] {
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]
  return coords.map(([lng, lat]) => [lat, lng] as LatLng)
}

function featureToLegs(feature: GeoJsonFeature): RouteLeg[] {
  const props = feature.properties ?? {}
  const rawRisk =
    (props.risk as number) ??
    (props.riskScore as number) ??
    (props.risk_score as number) ??
    undefined
  const risk = typeof rawRisk === 'number' ? rawRisk : undefined
  const color =
    (props.color as string) ??
    (props.stroke as string) ??
    colorForRisk(risk)

  if (feature.geometry.type === 'LineString') {
    return [
      {
        positions: lineToPositions(feature.geometry.coordinates as number[][]),
        color,
        risk,
      },
    ]
  }
  // MultiLineString
  return (feature.geometry.coordinates as number[][][]).map((line) => ({
    positions: lineToPositions(line),
    color,
    risk,
  }))
}

/**
 * Convert the backend's colored GeoJSON into render-ready legs + summary.
 * Tolerant of several reasonable response shapes:
 *   - a bare FeatureCollection
 *   - { geojson: FeatureCollection, summary?: {...} }
 *   - { route: FeatureCollection, ... }
 */
function normalizeRouteResponse(data: any): Omit<RouteResult, 'source'> {
  const fc: GeoJsonFeatureCollection | undefined =
    data?.type === 'FeatureCollection'
      ? data
      : data?.geojson?.type === 'FeatureCollection'
        ? data.geojson
        : data?.route?.type === 'FeatureCollection'
          ? data.route
          : undefined

  const legs: RouteLeg[] = fc
    ? fc.features.flatMap(featureToLegs)
    : []

  // summary: prefer explicit fields, otherwise derive from legs
  const summarySrc = data?.summary ?? data?.stats ?? data ?? {}
  const riskValues = legs.map((l) => l.risk).filter((r): r is number => r != null)
  const derivedRisk = riskValues.length
    ? Math.round(riskValues.reduce((a, b) => a + b, 0) / riskValues.length)
    : 0

  const riskScore = Number(
    summarySrc.riskScore ?? summarySrc.risk ?? summarySrc.avgRisk ?? derivedRisk,
  )
  const distanceKm = Number(
    summarySrc.distanceKm ??
      summarySrc.distance_km ??
      (summarySrc.distance ? Number(summarySrc.distance) / 1000 : 0),
  )
  const durationMin = Number(
    summarySrc.durationMin ??
      summarySrc.duration_min ??
      (summarySrc.duration ? Number(summarySrc.duration) / 60 : 0),
  )

  return {
    legs,
    summary: {
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
      durationMin: Number.isFinite(durationMin) ? durationMin : 0,
      riskScore: Number.isFinite(riskScore) ? riskScore : derivedRisk,
      riskBand: bandFromString(summarySrc.riskBand, riskScore || derivedRisk),
      highRiskSegments: riskValues.filter((r) => riskLevel(r) === 'high').length,
    },
    raw: data,
  }
}

/* ---------- Fallback (synthetic) builders ---------- */

function fallbackRoute(alpha: number): RouteResult {
  // Blend the precomputed fastest/safe routes based on the risk slider.
  const safe = alpha >= 0.5
  const path = safe ? SAFEROAD_ROUTE : FASTEST_ROUTE
  const cmp = safe ? ROUTE_COMPARISON.saferoad : ROUTE_COMPARISON.fastest
  return {
    legs: [
      {
        positions: path,
        color: colorForRisk(cmp.riskScore),
        risk: cmp.riskScore,
      },
    ],
    summary: {
      distanceKm: cmp.distanceKm,
      durationMin: cmp.durationMin,
      riskScore: cmp.riskScore,
      riskBand: riskLevel(cmp.riskScore),
      highRiskSegments: cmp.highRiskSegments,
    },
    raw: null,
    source: 'fallback',
  }
}

/* ---------- Public API ---------- */

export async function getHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${PROXY_BASE}/health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    return {
      status: data.status ?? 'ok',
      nodes: data.nodes,
      edges: data.edges,
      online: true,
    }
  } catch {
    return { status: 'offline', online: false }
  }
}

export async function findRoute(
  origin: LatLng,
  destination: LatLng,
  alpha: number,
): Promise<RouteResult> {
  try {
    const res = await fetch(`${PROXY_BASE}/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ origin, destination, alpha }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    const normalized = normalizeRouteResponse(data)
    if (!normalized.legs.length) throw new Error('empty route')
    return { ...normalized, source: 'backend' }
  } catch (err) {
    console.log('[v0] findRoute falling back to synthetic data:', String(err))
    return fallbackRoute(alpha)
  }
}

export async function predictRisk(
  features: Record<string, unknown>,
): Promise<PredictRiskResult> {
  try {
    const res = await fetch(`${PROXY_BASE}/predict-risk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(features),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    const score = Number(data.riskScore ?? data.risk_score ?? data.risk ?? 0)
    return {
      riskScore: score,
      riskBand: bandFromString(data.riskBand ?? data.risk_band, score),
      source: 'backend',
    }
  } catch (err) {
    console.log('[v0] predictRisk falling back to synthetic data:', String(err))
    const score = Number(features.riskScore ?? 0)
    return { riskScore: score, riskBand: riskLevel(score), source: 'fallback' }
  }
}
