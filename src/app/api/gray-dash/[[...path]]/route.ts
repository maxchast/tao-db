import type { NextRequest } from 'next/server'

function isLocalhostOrigin(raw: string): boolean {
  try {
    const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`
    const u = new URL(withScheme)
    const h = u.hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
  } catch {
    return /127\.0\.0\.1|localhost/i.test(raw)
  }
}

/** True when this Node process is running on a typical PaaS (not your laptop). */
function isCloudHost(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.VERCEL ||
      process.env.FLY_APP_NAME ||
      process.env.RENDER ||
      process.env.CF_PAGES
  )
}

/**
 * Proxies to the Bit / Gray Dash FastAPI miner telemetry API.
 * Set GRAY_DASH_API_URL to the server root (no `/api` suffix), e.g. http://127.0.0.1:8080 locally.
 * On Railway, use a **public** URL to your miner (tunnel); localhost is not your home machine.
 * For cloud, prefer NEXT_PUBLIC_GRAY_DASH_ORIGIN so the **browser** calls your tunnel (see src/lib/grayDashApi.ts).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const base = process.env.GRAY_DASH_API_URL?.replace(/\/$/, '')
  if (!base) {
    return Response.json(
      {
        error:
          'GRAY_DASH_API_URL is not set (server proxy disabled). For local dev add http://127.0.0.1:8080. For Railway use NEXT_PUBLIC_GRAY_DASH_ORIGIN=https://your-miner-tunnel.example.com (browser → miner) or GRAY_DASH_API_URL to a public miner URL reachable from this host.',
      },
      { status: 503 }
    )
  }

  if (isCloudHost() && isLocalhostOrigin(base)) {
    return Response.json(
      {
        error:
          'GRAY_DASH_API_URL points at localhost, which on Railway is this container—not your miner. Set NEXT_PUBLIC_GRAY_DASH_ORIGIN to your public miner/tunnel URL (recommended) or GRAY_DASH_API_URL to a URL reachable from the internet.',
      },
      { status: 503 }
    )
  }

  const { path = [] } = await context.params
  if (!path.length) {
    return Response.json(
      { error: 'Missing path. Expected e.g. /api/gray-dash/overview' },
      { status: 400 }
    )
  }

  const subpath = path.join('/')
  const search = request.nextUrl.search
  const target = `${base}/api/${subpath}${search}`

  try {
    const res = await fetch(target, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream fetch failed'
    return Response.json({ error: msg }, { status: 502 })
  }
}
