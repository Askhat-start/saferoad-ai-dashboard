'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react'
import {
  ROUTE_END,
  ROUTE_START,
  RISK_COLORS,
  RISK_LABELS,
  SEGMENTS,
  type LatLng,
} from '@/lib/city-data'
import { findRoute, type RouteResult } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Panel, PanelHeader } from '../primitives'
import { BackendStatus } from '../backend-status'

const CityMap = dynamic(() => import('../map/city-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  ),
})

function modeLabel(alpha: number) {
  if (alpha <= 0.33) return 'Fastest'
  if (alpha >= 0.67) return 'Safest'
  return 'Balanced'
}

export function RoutePlanner() {
  const [start, setStart] = useState<LatLng | null>(null)
  const [end, setEnd] = useState<LatLng | null>(null)
  const [alpha, setAlpha] = useState(0.6)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)

  const nextPoint = !start ? 'Start' : !end ? 'End' : null

  function handleMapClick(point: LatLng) {
    if (!start) {
      setStart(point)
    } else if (!end) {
      setEnd(point)
    }
    setResult(null)
  }

  async function handleFindRoute() {
    const o = start ?? ROUTE_START
    const d = end ?? ROUTE_END
    setStart(o)
    setEnd(d)
    setLoading(true)
    try {
      const res = await findRoute(o, d, alpha)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStart(null)
    setEnd(null)
    setResult(null)
  }

  const summary = result?.summary
  const band = summary ? summary.riskBand : null

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="relative flex-1">
        <CityMap
          segments={SEGMENTS}
          dimSegments
          routeLegs={result?.legs}
          start={start}
          end={end}
          onMapClick={handleMapClick}
        />

        {/* Bottom-center pill */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-xl">
            <MapPin className="size-4 text-primary" />
            {nextPoint ? (
              <span>
                Click map to set{' '}
                <span className="font-semibold text-primary">{nextPoint}</span>
              </span>
            ) : result ? (
              <span>
                Route ready · {result.summary.distanceKm.toFixed(1)} km ·{' '}
                {result.source === 'fallback' ? 'sample data' : 'live route'}
              </span>
            ) : (
              <span>Adjust risk sensitivity, then Find Route</span>
            )}
          </div>
        </div>

        {/* Risk legend */}
        <div className="pointer-events-none absolute bottom-4 left-4 flex gap-4 rounded-lg border border-border bg-card/85 px-3 py-2 text-xs backdrop-blur-xl">
          {(['low', 'medium', 'high'] as const).map((lvl) => (
            <div key={lvl} className="flex items-center gap-1.5">
              <span
                className="h-1 w-5 rounded-full"
                style={{ backgroundColor: RISK_COLORS[lvl] }}
              />
              <span className="capitalize text-foreground">{lvl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Control + summary panel */}
      <div className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card/30 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Route Planner
          </span>
          <BackendStatus />
        </div>

        {/* Pick points */}
        <Panel className="mb-3">
          <PanelHeader
            title="Pick Points"
            hint="Click the map to drop Start and End"
            icon={<Navigation className="size-4" />}
          />
          <div className="space-y-2 p-4">
            <PointRow
              color="#16a34a"
              label="Start"
              point={start}
              active={!start}
            />
            <PointRow
              color="#2563eb"
              label="End"
              point={end}
              active={!!start && !end}
            />
          </div>
        </Panel>

        {/* Risk sensitivity */}
        <Panel className="mb-3">
          <PanelHeader
            title="Risk Sensitivity"
            hint="Trade travel time against pedestrian safety"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Fast</span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {modeLabel(alpha)}
              </span>
              <span className="text-xs text-muted-foreground">Safe</span>
            </div>
            <Slider
              value={[alpha]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(v) => setAlpha(Array.isArray(v) ? v[0] : v)}
            />
            <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
              alpha = {alpha.toFixed(2)}
            </p>
          </div>
        </Panel>

        {/* Actions */}
        <div className="mb-3 flex gap-2">
          <Button
            className="flex-1"
            onClick={handleFindRoute}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Routing…
              </>
            ) : (
              <>
                <RouteIcon className="size-4" /> Find Route
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={handleReset} disabled={loading}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        {/* Summary */}
        {summary && band ? (
          <Panel>
            <PanelHeader
              title="Route Summary"
              hint={
                result?.source === 'fallback'
                  ? 'Computed from sample data (backend offline)'
                  : 'Computed by SafeRoad AI backend'
              }
              icon={<RouteIcon className="size-4" />}
            />
            <div className="grid grid-cols-2 gap-px bg-border">
              <SummaryStat
                icon={<Navigation className="size-3.5" />}
                label="Distance"
                value={`${summary.distanceKm.toFixed(1)} km`}
              />
              <SummaryStat
                icon={<Clock className="size-3.5" />}
                label="Est. Time"
                value={`${Math.round(summary.durationMin)} min`}
              />
              <SummaryStat
                label="Avg Risk"
                value={`${Math.round(summary.riskScore)}`}
                valueColor={RISK_COLORS[band]}
              />
              <SummaryStat
                label="Risk Band"
                value={RISK_LABELS[band]}
                valueColor={RISK_COLORS[band]}
              />
            </div>
            <div className="border-t border-border p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Safety profile</span>
                <span className="font-mono text-foreground">
                  {100 - Math.round(summary.riskScore)} / 100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${100 - summary.riskScore}%`,
                    backgroundColor: RISK_COLORS[band],
                  }}
                />
              </div>
              {summary.highRiskSegments > 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Route still crosses{' '}
                  <span className="text-risk-high">
                    {summary.highRiskSegments}
                  </span>{' '}
                  high-risk segment
                  {summary.highRiskSegments > 1 ? 's' : ''}. Increase risk
                  sensitivity to avoid more.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-risk-low">
                  No high-risk segments on this route.
                </p>
              )}
            </div>
          </Panel>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
            Set a Start and End point (or just press Find Route to use the
            default Al-Farabi → Zhibek Zholy corridor), then compute a
            risk-aware route.
          </p>
        )}
      </div>
    </div>
  )
}

function PointRow({
  color,
  label,
  point,
  active,
}: {
  color: string
  label: string
  point: LatLng | null
  active: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        active ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/30'
      }`}
    >
      <span
        className="size-3 shrink-0 rounded-full ring-2 ring-background"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {point
            ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}`
            : active
              ? 'Click map to set point'
              : 'Not set'}
        </p>
      </div>
    </div>
  )
}

function SummaryStat({
  icon,
  label,
  value,
  valueColor,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className="mt-1 font-mono text-xl font-semibold text-foreground"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  )
}
