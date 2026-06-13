'use client'

import useSWR from 'swr'
import { Database, Wifi, WifiOff } from 'lucide-react'
import { getHealth, type HealthResult } from '@/lib/api'
import { cn } from '@/lib/utils'

const fetcher = () => getHealth()

/**
 * Live indicator of whether the Flask backend is reachable.
 * Polls /api/saferoad/health every 15s. When offline, the app keeps
 * working from the synthetic Almaty dataset.
 */
export function BackendStatus({ className }: { className?: string }) {
  const { data } = useSWR<HealthResult>('saferoad-health', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  })

  const online = data?.online ?? false

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        online
          ? 'border-risk-low/40 bg-risk-low/10 text-risk-low'
          : 'border-border bg-secondary/60 text-muted-foreground',
        className,
      )}
      title={
        online
          ? `Backend online · ${data?.nodes ?? '—'} nodes / ${data?.edges ?? '—'} edges`
          : 'Backend offline — using sample data'
      }
    >
      {online ? (
        <Wifi className="size-3" />
      ) : (
        <WifiOff className="size-3" />
      )}
      <span>{online ? 'Live backend' : 'Sample data'}</span>
      {online && data?.nodes ? (
        <span className="flex items-center gap-1 border-l border-risk-low/30 pl-2 text-risk-low/80">
          <Database className="size-2.5" />
          {data.nodes.toLocaleString()}
        </span>
      ) : null}
    </div>
  )
}
