/**
 * CORS / mixed-content proxy helper.
 *
 * Some IPTV sources are served over plain HTTP or from CDNs that block
 * cross-origin requests / strip required headers. When the page runs over
 * HTTPS, an HTTP stream is "mixed content" and browsers refuse to load it.
 *
 * Defaults to the built-in Next.js Route Handler at `/api/proxy`, which
 * fetches the stream server-side (bypassing browser CORS / mixed-content
 * restrictions) and rewrites m3u8 manifests so segments and keys also flow
 * through the proxy. Override with NEXT_PUBLIC_PROXY_URL to use an external
 * proxy that accepts `?url=<encoded original url>`.
 */
export const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL ?? '/api/proxy'

/** CDNs / hosts known to be prone to CORS / header restrictions. */
const RESTRICTED_HOSTS = ['localnow', 'jmp2.uk']

export function needsProxy(originalUrl: string): boolean {
  try {
    const u = new URL(originalUrl)
    // 1. Plain HTTP served to an HTTPS page → mixed content.
    if (
      u.protocol === 'http:' &&
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:'
    ) {
      return true
    }
    // 2. Known restricted CDNs.
    if (RESTRICTED_HOSTS.some((h) => u.hostname.toLowerCase().includes(h))) {
      return true
    }
    // 3. Raw IP addresses using port 8000 (common for restricted IPTV origins).
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)
    if (isIp && u.port === '8000') {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function resolveStreamUrl(originalUrl: string, useProxy: boolean): string {
  const shouldProxy = useProxy && needsProxy(originalUrl)
  return shouldProxy
    ? `${PROXY_BASE}?url=${encodeURIComponent(originalUrl)}`
    : originalUrl
}
