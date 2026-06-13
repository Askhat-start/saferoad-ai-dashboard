import { type NextRequest, NextResponse } from 'next/server'
import { buildGraph } from '@/lib/server/almaty-graph'
import { findRoute } from '@/lib/server/router'
import {
  assignBand,
  predictRisk,
  type SegmentFeatures,
} from '@/lib/server/risk-model'

/**
 * SafeRoad AI backend — runs natively inside Next.js.
 *
 * The original backend was a Python Flask service (app.py) backed by a
 * scikit-learn model and a NetworkX graph. That stack can't run on Vercel, so
 * the routing engine, risk model, and Almaty road graph have been ported to
 * TypeScript (see lib/server/*). This handler exposes the same three endpoints
 * the frontend expects, computed entirely in-process — no external server, no
 * model file, works anywhere the app is deployed.
 *
 *   GET  /api/saferoad/health        -> { status, nodes, edges }
 *   POST /api/saferoad/route         -> colored GeoJSON route + summary
 *   POST /api/saferoad/predict-risk  -> { riskScore, riskBand }
 *
 * If BACKEND_URL is set, requests are forwarded to that live Flask server
 * instead (useful if you later host the real Python service); otherwise the
 * native engine handles everything.
 */

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, '')

async function forwardToFlask(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search ?? ''
  const target = `${BACKEND_URL}/api/${path.join('/')}${search}`
  const init: RequestInit = {
    method: req.method,
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text()
  }
  const res = await fetch(target, init)
  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
    },
  })
}

/** Map an arbitrary request body to the model's feature schema. */
function coerceFeatures(body: any): {
  features: SegmentFeatures | null
  fallbackScore: number | null
} {
  const has = (k: string) => body != null && body[k] !== undefined
  const hasModelFields =
    has('speedLimit') || has('lanes') || has('crosswalk') || has('lighting')

  if (hasModelFields) {
    return {
      features: {
        speedLimit: Number(body.speedLimit ?? 50),
        lanes: Number(body.lanes ?? 2),
        crosswalk: Number(body.crosswalk ?? 1),
        trafficLight: Number(body.trafficLight ?? 1),
        schoolNearby: Number(body.schoolNearby ?? 0),
        busStopNearby: Number(body.busStopNearby ?? 0),
        lighting: String(body.lighting ?? 'good'),
        sidewalkQuality: String(body.sidewalkQuality ?? 'good'),
      },
      fallbackScore: null,
    }
  }

  // No model fields — use a provided stored risk score if present.
  const score =
    body?.riskScore ?? body?.risk_score ?? body?.risk ?? null
  return {
    features: null,
    fallbackScore: score == null ? null : Number(score),
  }
}

async function handle(req: NextRequest, path: string[]) {
  const endpoint = path.join('/')

  if (BACKEND_URL) {
    // A live Flask server is configured — defer to it, but fall back to the
    // native engine if it can't be reached so the demo never breaks.
    try {
      return await forwardToFlask(req, path)
    } catch (err) {
      console.log('[v0] BACKEND_URL unreachable, using native engine:', String(err))
    }
  }

  if (endpoint === 'health') {
    const g = buildGraph()
    return NextResponse.json({
      status: 'ok',
      engine: 'native-ts',
      nodes: g.nodes.length,
      edges: g.edgeCount,
    })
  }

  if (endpoint === 'route') {
    const body = await req.json().catch(() => null)
    const origin = body?.origin
    const destination = body?.destination
    const alpha = body?.alpha ?? 0.5
    if (
      !Array.isArray(origin) ||
      !Array.isArray(destination) ||
      origin.length < 2 ||
      destination.length < 2
    ) {
      return NextResponse.json(
        { error: 'bad_request', message: 'origin and destination must be [lat,lng].' },
        { status: 400 },
      )
    }
    try {
      const result = findRoute(
        [Number(origin[0]), Number(origin[1])],
        [Number(destination[0]), Number(destination[1])],
        Number(alpha),
      )
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json(
        { error: 'no_route', message: String(err) },
        { status: 422 },
      )
    }
  }

  if (endpoint === 'predict-risk') {
    const body = await req.json().catch(() => null)
    const { features, fallbackScore } = coerceFeatures(body)
    if (features) {
      return NextResponse.json(predictRisk(features))
    }
    if (fallbackScore != null && Number.isFinite(fallbackScore)) {
      const s = Math.max(0, Math.min(100, fallbackScore))
      return NextResponse.json({ riskScore: s, riskBand: assignBand(s) })
    }
    return NextResponse.json(
      { error: 'bad_request', message: 'Provide road-segment features or a riskScore.' },
      { status: 400 },
    )
  }

  return NextResponse.json(
    { error: 'not_found', message: `Unknown endpoint /${endpoint}` },
    { status: 404 },
  )
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return handle(req, path)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return handle(req, path)
}
