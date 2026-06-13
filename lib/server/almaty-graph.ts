/**
 * almaty-graph.ts — TypeScript port of graph_builder.py.
 *
 * Builds a realistic road graph for central Almaty: a UTM-aligned grid of
 * intersections with E-W boulevards and N-S avenues, just like the Python
 * synthetic graph. Each directed edge gets deterministic infrastructure
 * features and a risk score from the ported risk model.
 *
 * The graph is built once and cached at module scope for the lifetime of the
 * server process (mirrors the pickle cache in the original).
 */

import {
  assignBand,
  predictRiskScore,
  type RiskBand,
  type SegmentFeatures,
} from './risk-model'

// ── Almaty bounding box (central area), matching graph_builder.py ────────────
const LAT_MIN = 43.2
const LAT_MAX = 43.275
const LNG_MIN = 76.84
const LNG_MAX = 76.96

const COLS = 30
const ROWS = 20

export interface GraphNode {
  id: number
  lat: number
  lng: number
}

export interface GraphEdge {
  from: number
  to: number
  length: number // metres
  riskScore: number // 0..100
  riskBand: RiskBand
  speedKph: number
  features: SegmentFeatures
}

export interface CityGraph {
  nodes: GraphNode[]
  /** adjacency: nodeId -> outgoing edges */
  adj: Map<number, GraphEdge[]>
  edgeCount: number
}

/* ---------- deterministic PRNG (mulberry32) ---------- */

function makeRng(seed: number) {
  let a = seed >>> 0
  return function next(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function choice<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/* ---------- geometry ---------- */

function gridPos(col: number, row: number): [number, number] {
  const lat = LAT_MIN + (row / (ROWS - 1)) * (LAT_MAX - LAT_MIN)
  const lng = LNG_MIN + (col / (COLS - 1)) * (LNG_MAX - LNG_MIN)
  return [lat, lng]
}

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlam = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ---------- street typing + features ---------- */

type Highway = 'primary' | 'secondary' | 'tertiary' | 'residential'

function highwayType(col: number, row: number): Highway {
  if (row % 5 === 0) return 'primary'
  if (col % 5 === 0) return 'secondary'
  if (row % 2 === 0) return 'tertiary'
  return 'residential'
}

const SPEED_MAP: Record<Highway, number> = {
  primary: 60,
  secondary: 50,
  tertiary: 40,
  residential: 30,
}

function edgeFeatures(
  highway: Highway,
  col: number,
  row: number,
): SegmentFeatures {
  const rng = makeRng((col * 1000 + row) ^ 0xabcd)
  const isMajor = highway === 'primary' || highway === 'secondary'

  let speed = SPEED_MAP[highway] + randInt(rng, -5, 5)
  speed = Math.max(30, Math.min(80, speed))

  const lanes =
    highway === 'primary'
      ? choice(rng, [3, 4])
      : highway === 'secondary'
        ? choice(rng, [2, 3])
        : highway === 'tertiary'
          ? 2
          : 1

  const crosswalk = isMajor && rng() < 0.5 ? 0 : randInt(rng, 0, 1)
  const trafficLight = isMajor && rng() < 0.75 ? 1 : randInt(rng, 0, 1)
  const schoolNearby = rng() < 0.12 ? 1 : 0
  const busStopNearby = rng() < (isMajor ? 0.4 : 0.2) ? 1 : 0
  const lighting = rng() < 0.6 ? 'good' : 'poor'
  const sidewalkOpts = isMajor
    ? ['good', 'medium']
    : ['good', 'medium', 'poor']
  const sidewalkQuality = choice(rng, sidewalkOpts)

  return {
    speedLimit: speed,
    lanes,
    crosswalk,
    trafficLight,
    schoolNearby,
    busStopNearby,
    lighting,
    sidewalkQuality,
  }
}

/* ---------- graph build (cached) ---------- */

let cached: CityGraph | null = null

export function buildGraph(): CityGraph {
  if (cached) return cached

  const nodes: GraphNode[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const id = row * COLS + col
      const [lat, lng] = gridPos(col, row)
      nodes.push({ id, lat, lng })
    }
  }

  const adj = new Map<number, GraphEdge[]>()
  for (const n of nodes) adj.set(n.id, [])
  let edgeCount = 0

  const addEdge = (u: number, v: number, col: number, row: number) => {
    const highway = highwayType(col, row)
    const feats = edgeFeatures(highway, col, row)
    const nu = nodes[u]
    const nv = nodes[v]
    const length = haversine(nu.lat, nu.lng, nv.lat, nv.lng)
    const score = predictRiskScore(feats)
    const edge: GraphEdge = {
      from: u,
      to: v,
      length,
      riskScore: score,
      riskBand: assignBand(score),
      speedKph: feats.speedLimit,
      features: feats,
    }
    adj.get(u)!.push(edge)
    edgeCount++
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const u = row * COLS + col
      // Horizontal (E-W)
      if (col + 1 < COLS) {
        const v = row * COLS + (col + 1)
        addEdge(u, v, col, row)
        addEdge(v, u, col + 1, row)
      }
      // Vertical (N-S)
      if (row + 1 < ROWS) {
        const v = (row + 1) * COLS + col
        addEdge(u, v, col, row)
        addEdge(v, u, col, row + 1)
      }
    }
  }

  cached = { nodes, adj, edgeCount }
  return cached
}
