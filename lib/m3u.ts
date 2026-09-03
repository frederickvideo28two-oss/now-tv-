export type ChannelKind = 'live' | 'vod'

export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  group?: string
  kind: ChannelKind
}

/** Extract an attribute like tvg-logo="..." from an #EXTINF line. */
function attr(line: string, key: string): string | undefined {
  const match = line.match(new RegExp(`${key}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() || undefined
}

/**
 * Decide whether a stream is Live TV or VOD (movie/series/on-demand video).
 * Heuristic based on the stream extension and group/name hints.
 */
function classify(url: string, group?: string, name?: string): ChannelKind {
  const haystack = `${group ?? ''} ${name ?? ''}`.toLowerCase()
  const vodHints = [
    'vod',
    'movie',
    'movies',
    'pelicula',
    'película',
    'peliculas',
    'series',
    'serie',
    'season',
    'episode',
    'capitulo',
    'capítulo',
    'on demand',
    'bajo demanda',
  ]
  const liveHints = [
    'live',
    'tv',
    'canal',
    'channel',
    'directo',
    'en vivo',
    'noticias',
    'sports',
    'deportes',
  ]
  const cleanUrl = url.split('?')[0].toLowerCase()
  // HLS / live streams
  if (cleanUrl.endsWith('.m3u8') || cleanUrl.endsWith('.ts')) {
    if (vodHints.some((h) => haystack.includes(h))) return 'vod'
    return 'live'
  }
  // Progressive video files → VOD
  if (/\.(mp4|mkv|avi|mov|webm|flv)$/.test(cleanUrl)) return 'vod'
  if (vodHints.some((h) => haystack.includes(h))) return 'vod'
  if (liveHints.some((h) => haystack.includes(h))) return 'live'
  return 'live'
}

/** Parse the text of an M3U / M3U8 playlist into a list of channels. */
export function parseM3U(content: string): Channel[] {
  const lines = content.split(/\r?\n/)
  const channels: Channel[] = []
  let pending: { name: string; logo?: string; group?: string } | null = null
  let index = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.toUpperCase().startsWith('#EXTINF')) {
      const logo = attr(line, 'tvg-logo')
      const group = attr(line, 'group-title')
      const tvgName = attr(line, 'tvg-name')
      const commaIndex = line.indexOf(',')
      const name =
        commaIndex !== -1
          ? line.slice(commaIndex + 1).trim()
          : (tvgName ?? 'Canal sin nombre')
      pending = {
        name: name || tvgName || 'Canal sin nombre',
        logo,
        group,
      }
    } else if (line.startsWith('#')) {
      // Ignore other directives (#EXTM3U, #EXTVLCOPT, etc.)
      if (line.toUpperCase().startsWith('#EXTGRP:') && pending) {
        pending.group = pending.group ?? line.slice(8).trim()
      }
      continue
    } else {
      // A URL line
      const url = line
      const base = pending ?? { name: 'Canal sin nombre' }
      channels.push({
        id: `${index}-${url}`,
        name: base.name || 'Canal sin nombre',
        url,
        logo: base.logo,
        group: base.group,
        kind: classify(url, base.group, base.name),
      })
      index += 1
      pending = null
    }
  }

  return channels
}
