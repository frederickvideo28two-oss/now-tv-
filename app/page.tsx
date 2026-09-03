'use client'

import { useMemo, useState } from 'react'
import { NowTvHeader } from '@/components/now-tv-header'
import { M3uLoader } from '@/components/m3u-loader'
import { VideoPlayer } from '@/components/video-player'
import { ChannelGrid } from '@/components/channel-grid'
import type { Channel } from '@/lib/m3u'

export default function HomePage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [useProxy, setUseProxy] = useState(true)

  const activeIndex = useMemo(
    () => channels.findIndex((c) => c.id === activeId),
    [channels, activeId],
  )
  const activeChannel = activeIndex >= 0 ? channels[activeIndex] : null

  const liveCount = useMemo(
    () => channels.filter((c) => c.kind === 'live').length,
    [channels],
  )
  const vodCount = channels.length - liveCount

  function handleLoad(loaded: Channel[]) {
    setChannels(loaded)
    setActiveId(loaded[0]?.id ?? null)
  }

  function goPrev() {
    if (activeIndex > 0) setActiveId(channels[activeIndex - 1].id)
  }

  function goNext() {
    if (activeIndex >= 0 && activeIndex < channels.length - 1) {
      setActiveId(channels[activeIndex + 1].id)
    }
  }

  return (
    <main className="nt-ambient min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <NowTvHeader
          channelCount={channels.length}
          liveCount={liveCount}
          vodCount={vodCount}
        />

        <M3uLoader
          onLoad={handleLoad}
          useProxy={useProxy}
          onUseProxyChange={setUseProxy}
        />

        <VideoPlayer
          channel={activeChannel}
          useProxy={useProxy}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < channels.length - 1}
          onPrev={goPrev}
          onNext={goNext}
        />

        <ChannelGrid
          channels={channels}
          activeId={activeId}
          onSelect={(c) => setActiveId(c.id)}
        />
      </div>
    </main>
  )
}
