'use client'

import { useRef, useState } from 'react'
import {
  Link2,
  ListVideo,
  Loader2,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseM3U, type Channel } from '@/lib/m3u'
import { PROXY_BASE } from '@/lib/proxy'

interface M3uLoaderProps {
  onLoad: (channels: Channel[]) => void
  useProxy: boolean
  onUseProxyChange: (value: boolean) => void
}

export function M3uLoader({
  onLoad,
  useProxy,
  onUseProxyChange,
}: M3uLoaderProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadFromUrl(rawUrl: string) {
    const target = rawUrl.trim()
    if (!target) {
      setError('Introduce la URL de una lista M3U.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Route the playlist fetch through the proxy to dodge CORS on the list itself.
      const fetchUrl = `${PROXY_BASE}?url=${encodeURIComponent(target)}`
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
      const text = await res.text()
      handleText(text)
    } catch (err) {
      console.log('[v0] M3U url load failed:', (err as Error).message)
      setError(
        'No se pudo cargar la lista. Revisa la URL o prueba a subir el archivo.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleText(text: string) {
    const channels = parseM3U(text)
    if (channels.length === 0) {
      setError('La lista no contiene canales válidos.')
      return
    }
    setError(null)
    onLoad(channels)
  }

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      const text = await file.text()
      handleText(text)
    } catch {
      setError('No se pudo leer el archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="nt-glass rounded-2xl border border-border p-4 sm:p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void loadFromUrl(url)
        }}
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background/40 px-3 focus-within:ring-2 focus-within:ring-ring/60">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            placeholder="https://ejemplo.com/lista.m3u"
            aria-label="URL de la lista M3U"
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListVideo className="h-4 w-4" />
            )}
            Cargar
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title="Subir un archivo .m3u"
          >
            <Upload className="h-4 w-4" />
            Archivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </form>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={useProxy}
            onChange={(e) => onUseProxyChange(e.target.checked)}
            className="h-4 w-4 rounded border-input"
            style={{ accentColor: 'var(--primary)' }}
          />
          <ShieldCheck className="h-4 w-4 text-primary" />
          Usar proxy para fuentes con CORS / HTTP
        </label>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}
