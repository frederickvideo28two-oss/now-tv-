'use client'

import { useMemo, useState } from 'react'
import { Search, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/lib/m3u'

type Filter = 'all' | 'live' | 'vod'

interface ChannelGridProps {
  channels: Channel[]
  activeId: string | null
  onSelect: (channel: Channel) => void
}

export function ChannelGrid({ channels, activeId, onSelect }: ChannelGridProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return channels.filter((c) => {
      if (filter !== 'all' && c.kind !== filter) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        (c.group?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [channels, query, filter])

  if (channels.length === 0) return null

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'live', label: 'En vivo' },
    { key: 'vod', label: 'VOD' },
  ]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-card/60 px-3 focus-within:ring-2 focus-within:ring-ring/60 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canal o grupo…"
            aria-label="Buscar canal"
            className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          No hay canales que coincidan con la búsqueda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((channel) => (
            <li key={channel.id}>
              <ChannelCard
                channel={channel}
                active={channel.id === activeId}
                onSelect={() => onSelect(channel)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ChannelCard({
  channel,
  active,
  onSelect,
}: {
  channel: Channel
  active: boolean
  onSelect: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/50',
        active ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-secondary/50">
        {channel.logo && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo || '/placeholder.svg'}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <Tv className="h-8 w-8 text-muted-foreground" />
        )}
        <span
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black"
          style={{
            backgroundColor:
              channel.kind === 'live' ? 'var(--live)' : 'var(--vod)',
          }}
        >
          {channel.kind === 'live' ? 'Live' : 'VOD'}
        </span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-foreground">
          {channel.name}
        </p>
        {channel.group ? (
          <p className="truncate text-xs text-muted-foreground">
            {channel.group}
          </p>
        ) : null}
      </div>
    </button>
  )
}
