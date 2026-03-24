/**
 * Gray Dash fetches miner telemetry from the Bit FastAPI (`/api/overview`, etc.).
 *
 * - Local dev: same-origin `/api/gray-dash/...` proxies to GRAY_DASH_API_URL (e.g. http://127.0.0.1:8080).
 * - Cloud (Railway, etc.): set NEXT_PUBLIC_GRAY_DASH_ORIGIN to your **public** miner API origin (no `/api` suffix).
 *   The browser calls that URL directly so the dashboard works even though Railway cannot reach your home PC.
 *   Your Bit FastAPI CORS must include this Next app’s origin (e.g. https://your-app.up.railway.app).
 *
 * Optional: GRAY_DASH_API_URL on the server to a **public** URL if you prefer server-side proxying instead.
 */

export function grayDashRequestUrl(endpoint: string): string {
  const direct =
    typeof process.env.NEXT_PUBLIC_GRAY_DASH_ORIGIN === 'string'
      ? process.env.NEXT_PUBLIC_GRAY_DASH_ORIGIN.trim().replace(/\/$/, '')
      : ''
  if (direct) {
    return `${direct}/api/${endpoint}`
  }
  return `/api/gray-dash/${endpoint}`
}

export function grayDashUsesBrowserDirect(): boolean {
  const o = process.env.NEXT_PUBLIC_GRAY_DASH_ORIGIN?.trim()
  return Boolean(o && o.length > 0)
}
