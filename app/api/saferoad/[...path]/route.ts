import { type NextRequest, NextResponse } from 'next/server'

/**
 * Same-origin proxy to the SafeRoad AI Flask backend.
 *
 * The frontend always calls /api/saferoad/<path> on its own origin, and this
 * handler forwards the request to `${BACKEND_URL}/api/<path>`. This keeps the
 * browser from having to talk to the Flask server directly, sidestepping CORS
 * and HTTPS->HTTP mixed-content issues during demos and deployment.
 *
 * Configure the backend location with the BACKEND_URL environment variable,
 * e.g. http://localhost:5000 (local Flask) or https://your-app.up.railway.app
 */

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:5000').replace(
  /\/$/,
  '',
)

export const dynamic = 'force-dynamic'

async function forward(req: NextRequest, path: string[]) {
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

  try {
    const res = await fetch(target, init)
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'content-type':
          res.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'backend_unreachable',
        message: `Could not reach SafeRoad backend at ${BACKEND_URL}. Is the Flask server running and is BACKEND_URL set?`,
        detail: String(err),
      },
      { status: 502 },
    )
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path)
}
