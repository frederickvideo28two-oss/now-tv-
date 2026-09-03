import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function corsHeaders(extra?: Record<string, string>): Headers {
  const h = new Headers(extra)
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Range, Content-Type')
  return h
}

function proxied(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

/**
 * Rewrite an HLS manifest so that every segment, key, media and sub-playlist
 * URL is resolved to an absolute URL and routed back through this proxy.
 */
function rewriteManifest(text: string, base: URL): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      if (trimmed.startsWith('#')) {
        // Rewrite URI="..." attributes (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP, ...)
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
          try {
            return `URI="${proxied(new URL(uri, base).toString())}"`
          } catch {
            return _m
          }
        })
      }

      // A URI line (media segment or nested playlist).
      try {
        return proxied(new URL(trimmed, base).toString())
      } catch {
        return line
      }
    })
    .join('\n')
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url')
  if (!target) {
    return new Response('Missing "url" query parameter.', {
      status: 400,
      headers: corsHeaders(),
    })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(target)
  } catch {
    return new Response('Invalid target URL.', {
      status: 400,
      headers: corsHeaders(),
    })
  }

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return new Response('Only http(s) targets are supported.', {
      status: 400,
      headers: corsHeaders(),
    })
  }

  const range = req.headers.get('range')

  let upstream: Response
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: '*/*',
        // Present the target's own origin as referer to satisfy some CDNs.
        Referer: `${targetUrl.origin}/`,
        ...(range ? { Range: range } : {}),
      },
      cache: 'no-store',
    })
  } catch (err) {
    console.log('[v0] Proxy upstream fetch failed:', (err as Error).message)
    return new Response('Upstream fetch failed.', {
      status: 502,
      headers: corsHeaders(),
    })
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  const isManifest =
    /mpegurl|vnd\.apple\.mpegurl|x-mpegurl/i.test(contentType) ||
    /\.m3u8($|\?)/i.test(targetUrl.pathname)

  if (isManifest) {
    const text = await upstream.text()
    const rewritten = rewriteManifest(text, upstream.url ? new URL(upstream.url) : targetUrl)
    return new Response(rewritten, {
      status: upstream.status,
      headers: corsHeaders({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
      }),
    })
  }

  // Stream binary payloads (segments, keys, progressive video) straight through.
  const headers = corsHeaders({ 'Cache-Control': 'no-store' })
  for (const key of [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
  ]) {
    const value = upstream.headers.get(key)
    if (value) headers.set(key, value)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}
