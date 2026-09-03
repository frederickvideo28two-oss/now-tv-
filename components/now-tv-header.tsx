import { Tv } from 'lucide-react'

interface NowTvHeaderProps {
  channelCount: number
  liveCount: number
  vodCount: number
}

export function NowTvHeader({
  channelCount,
  liveCount,
  vodCount,
}: NowTvHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Tv className="h-6 w-6 text-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-none tracking-tight text-foreground">
            Now <span className="text-primary">TV</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reproductor IPTV para listas M3U / M3U8
          </p>
        </div>
      </div>

      {channelCount > 0 ? (
        <dl className="flex items-center gap-2 text-sm">
          <Stat label="Canales" value={channelCount} />
          <Stat label="En vivo" value={liveCount} tone="live" />
          <Stat label="VOD" value={vodCount} tone="vod" />
        </dl>
      ) : null}
    </header>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'live' | 'vod'
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
      {tone ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: tone === 'live' ? 'var(--live)' : 'var(--vod)',
          }}
          aria-hidden="true"
        />
      ) : null}
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
