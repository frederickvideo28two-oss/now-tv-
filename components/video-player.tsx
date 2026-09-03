'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  AlertTriangle,
  AudioLines,
  Captions,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveStreamUrl } from '@/lib/proxy'
import type { Channel } from '@/lib/m3u'

interface Track {
  id: number
  label: string
}

interface VideoPlayerProps {
  channel: Channel | null
  useProxy: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function VideoPlayer({
  channel,
  useProxy,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [audioTracks, setAudioTracks] = useState<Track[]>([])
  const [subtitleTracks, setSubtitleTracks] = useState<Track[]>([])
  const [currentAudio, setCurrentAudio] = useState(-1)
  const [currentSub, setCurrentSub] = useState(-1)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubMenu, setShowSubMenu] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel) return

    setError(null)
    setLoading(true)
    setAudioTracks([])
    setSubtitleTracks([])
    setCurrentAudio(-1)
    setCurrentSub(-1)

    const src = resolveStreamUrl(channel.url, useProxy)
    const isHls = /\.m3u8($|\?)/i.test(channel.url) || channel.kind === 'live'

    // Clean up any previous hls.js instance.
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    function onCanPlay() {
      setLoading(false)
      void video?.play().catch(() => {})
    }
    video.addEventListener('canplay', onCanPlay)

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        void video.play().catch(() => {})
      })

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        const tracks = hls.audioTracks.map((t, i) => ({
          id: i,
          label: t.name || t.lang || `Audio ${i + 1}`,
        }))
        setAudioTracks(tracks)
        setCurrentAudio(hls.audioTrack)
      })

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        const tracks = hls.subtitleTracks.map((t, i) => ({
          id: i,
          label: t.name || t.lang || `Subtítulo ${i + 1}`,
        }))
        setSubtitleTracks(tracks)
        setCurrentSub(hls.subtitleTrack)
      })

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          console.log('[v0] HLS fatal error:', data.type, data.details)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              setError('No se pudo reproducir este canal.')
              setLoading(false)
              hls.destroy()
              hlsRef.current = null
          }
        }
      })
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari).
      video.src = src
    } else {
      // Progressive video (mp4, webm, ...).
      video.src = src
    }

    function onVideoError() {
      setError('No se pudo reproducir este canal.')
      setLoading(false)
    }
    video.addEventListener('error', onVideoError)

    return () => {
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onVideoError)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeAttribute('src')
      video.load()
    }
  }, [channel, useProxy])

  function selectAudio(id: number) {
    if (hlsRef.current) hlsRef.current.audioTrack = id
    setCurrentAudio(id)
    setShowAudioMenu(false)
  }

  function selectSub(id: number) {
    if (hlsRef.current) hlsRef.current.subtitleTrack = id
    setCurrentSub(id)
    setShowSubMenu(false)
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary/40 to-background"
    >
      <div className="relative aspect-video w-full bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="h-full w-full bg-black"
          controls
          playsInline
        />

        {!channel ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-lg font-medium text-foreground">
              Selecciona un canal para empezar
            </p>
            <p className="text-sm text-muted-foreground">
              Carga una lista M3U y elige un canal de la parrilla.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Prueba a activar el proxy o elige otro canal.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={onPrev}
            disabled={!hasPrev}
            title="Canal anterior"
            aria-label="Canal anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onNext}
            disabled={!hasNext}
            title="Canal siguiente"
            aria-label="Canal siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {channel?.name ?? 'Sin canal'}
            </p>
            {channel?.group ? (
              <p className="truncate text-xs text-muted-foreground">
                {channel.group}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                setShowAudioMenu((v) => !v)
                setShowSubMenu(false)
              }}
              disabled={audioTracks.length <= 1}
              title="Pistas de audio"
              aria-label="Pistas de audio"
            >
              <AudioLines className="h-4 w-4 text-primary" />
            </Button>
            {showAudioMenu && audioTracks.length > 0 ? (
              <TrackMenu
                tracks={audioTracks}
                current={currentAudio}
                onSelect={selectAudio}
                title="Audio"
              />
            ) : null}
          </div>

          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                setShowSubMenu((v) => !v)
                setShowAudioMenu(false)
              }}
              disabled={subtitleTracks.length === 0}
              title="Subtítulos"
              aria-label="Subtítulos"
            >
              <Captions className="h-4 w-4 text-primary" />
            </Button>
            {showSubMenu && subtitleTracks.length > 0 ? (
              <TrackMenu
                tracks={[{ id: -1, label: 'Desactivados' }, ...subtitleTracks]}
                current={currentSub}
                onSelect={selectSub}
                title="Subtítulos"
              />
            ) : null}
          </div>

          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            title="Pantalla completa"
            aria-label="Pantalla completa"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function TrackMenu({
  tracks,
  current,
  onSelect,
  title,
}: {
  tracks: Track[]
  current: number
  onSelect: (id: number) => void
  title: string
}) {
  return (
    <div className="absolute bottom-full right-0 z-20 mb-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl">
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {tracks.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary',
            current === t.id && 'text-primary',
          )}
        >
          <span className="truncate">{t.label}</span>
          {current === t.id ? <span className="ml-2 text-xs">●</span> : null}
        </button>
      ))}
    </div>
  )
}
