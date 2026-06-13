/**
 * router.ts — TypeScript port of router.py (risk-aware routing).
 *
 * alpha = 0.0 -> fastest route, alpha = 1.0 -> safest route.
 * Combined edge cost blends normalized travel time against risk score, then we
 * run Dijkstra over the Almaty graph and return colored GeoJSON plus summary
 * stats in the exact shape the frontend's lib/api.ts already normalizes.
 */

import {
  buildGraph,
  type CityGraph,
  type GraphEdge,
} from './almaty-graph'

export interface RouteResponse {
  geojson: {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: { type: 'LineString'; coordinates: number[][] }
      properties: { riskScore: number; riskBand: string; length: number }
    }>
  }
  // Python-style fields
  totalRisk: number
  totalTime: number // seconds
  totalDistance: number // metres
  riskBand: string
  nodeCount: number
  alpha: number
  // Convenience fields the UI consumes directly
  riskScore: number
  distanceKm: number
  durationMin: number
}

function nearestNode(
  g: CityGraph,
  lat: number,
  lng: number,
): number {
  let best = -1
  let bestDist = Infinity
  for (const n of g.nodes) {
    const d = (n.lat - lat) ** 2 + (n.lng - lng) ** 2
    if (d < bestDist) {
      bestDist = d
      best = n.id
    }
  }
  return best
}

function travelTime(edge: GraphEdge): number {
  const speed = Math.max(10, edge.speedKph)
  return Math.max(1, (edge.length / 1000 / speed) * 3600)
}

function combinedCost(edge: GraphEdge, alpha: number): number {
  const timeNorm = (travelTime(edge) / 30) * 50
  return (1 - alpha) * timeNorm + alpha * edge.riskScore
}

/** Min-heap Dijkstra returning predecessor + chosen-edge maps. */
function dijkstra(
  g: CityGraph,
  source: number,
  target: number,
  alpha: number,
): { prev: Map<number, number>; prevEdge: Map<number, GraphEdge> } | null {
  const dist = new Map<number, number>()
  const prev = new Map<number, number>()
  const prevEdge = new Map<number, GraphEdge>()
  dist.set(source, 0)

  // Simple binary heap of [cost, node].
  const heap: Array<[number, number]> = [[0, source]]
  const push = (cost: number, node: number) => {
    heap.push([cost, node])
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= heap[i][0]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  const pop = (): [number, number] => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        let s = i
        if (l < heap.length && heap[l][0] < heap[s][0]) s = l
        if (r < heap.length && heap[r][0] < heap[s][0]) s = r
        if (s === i) break
        ;[heap[s], heap[i]] = [heap[i], heap[s]]
        i = s
      }
    }
    return top
  }

  const visited = new Set<number>()
  while (heap.length) {
    const [cost, u] = pop()
    if (visited.has(u)) continue
    visited.add(u)
    if (u === target) break
    for (const edge of g.adj.get(u) ?? []) {
      const nd = cost + combinedCost(edge, alpha)
      if (nd < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, nd)
        prev.set(edge.to, u)
        prevEdge.set(edge.to, edge)
        push(nd, edge.to)
      }
    }
  }

  if (!prev.has(target) && source !== target) return null
  return { prev, prevEdge }
}

export function findRoute(
  origin: [number, number],
  destination: [number, number],
  alphaInput: number,
): RouteResponse {
  const alpha = Math.max(0, Math.min(1, Number(alphaInput)))
  const g = buildGraph()

  const origNode = nearestNode(g, origin[0], origin[1])
  const destNode = nearestNode(g, destination[0], destination[1])
  if (origNode === destNode) {
    throw new Error('Origin and destination resolve to the same point.')
  }

  const result = dijkstra(g, origNode, destNode, alpha)
  if (!result) throw new Error('No path found between selected points.')

  // Reconstruct path from target back to source.
  const pathNodes: number[] = []
  let cur: number | undefined = destNode
  while (cur !== undefined) {
    pathNodes.unshift(cur)
    if (cur === origNode) break
    cur = result.prev.get(cur)
  }

  const features: RouteResponse['geojson']['features'] = []
  const risks: number[] = []
  let totalTime = 0
  let totalDist = 0

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const edge = result.prevEdge.get(pathNodes[i + 1])
    if (!edge) continue
    const a = g.nodes[edge.from]
    const b = g.nodes[edge.to]
    risks.push(edge.riskScore)
    totalTime += travelTime(edge)
    totalDist += edge.length
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // GeoJSON is [lng, lat]
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      },
      properties: {
        riskScore: edge.riskScore,
        riskBand: edge.riskBand,
        length: round1(edge.length),
      },
    })
  }

  const avgRisk = risks.length
    ? risks.reduce((x, y) => x + y, 0) / risks.length
    : 50
  const band = avgRisk < 50 ? 'Low' : avgRisk < 80 ? 'Medium' : 'High'

  return {
    geojson: { type: 'FeatureCollection', features },
    totalRisk: round1(avgRisk),
    totalTime: Math.round(totalTime),
    totalDistance: Math.round(totalDist),
    riskBand: band,
    nodeCount: pathNodes.length,
    alpha,
    riskScore: round1(avgRisk),
    distanceKm: round2(totalDist / 1000),
    durationMin: round1(totalTime / 60),
  }
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}
function round2(v: number): number {
  return Math.round(v * 100) / 100
}
