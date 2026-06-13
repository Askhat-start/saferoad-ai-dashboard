'use client'

import dynamic from 'next/dynamic'
import {
  Clock,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
  ShieldX,
  TrendingUp,
} from 'lucide-react'
import {
  FASTEST_ROUTE,
  ROUTE_COMPARISON,
  ROUTE_END,
  ROUTE_START,
  SAFEROAD_ROUTE,
  SEGMENTS,
} from '@/lib/city-data'
import { Panel, PanelHeader } from '../primitives'

const CityMap = dynamic(() => import('../map/city-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  ),
})

export function RoutePlanner() {
  const { fastest, saferoad } = ROUTE_COMPARISON

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="relative flex-1">
        <CityMap
          segments={SEGMENTS}
          showRoutes
          dimSegments
          fastestRoute={FASTEST_ROUTE}
          saferoadRoute={SAFEROAD_ROUTE}
          start={ROUTE_START}
          end={ROUTE_END}
        />
        {/* Legend overlay */}
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-border bg-card/85 px-3 py-2.5 text-xs backdrop-blur-xl">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-primary" />
            <span className="text-foreground">SafeRoad AI route</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-1 w-6 rounded-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg,#dc2626 0 3px,transparent 3px 7px)',
              }}
            />
            <span className="text-foreground">Fastest route</span>
          </div>
        </div>
      </div>

      {/* Comparison panel */}
      <div className="w-[400px] shrink-0 overflow-y-auto border-l border-border bg-card/30 p-4 backdrop-blur-xl">
        <Panel className="mb-3">
          <PanelHeader
            title="Route Comparison"
            hint="From Al-Farabi Ave → Zhibek Zholy promenade"
            icon={<RouteIcon className="size-4" />}
          />
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Fastest */}
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-risk-high/15 text-risk-high">
                  <ShieldX className="size-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {fastest.label}
                </span>
              </div>
              <Stat label="Distance" value={`${fastest.distanceKm} km`} />
              <Stat label="Est. time" value={`${fastest.durationMin} min`} />
              <Stat
                label="Risk score"
                value={`${fastest.riskScore}`}
                valueClass="text-risk-high"
              />
              <Stat
                label="High-risk segments"
                value={`${fastest.highRiskSegments}`}
                valueClass="text-risk-high"
              />
            </div>
            {/* SafeRoad */}
            <div className="bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <ShieldCheck className="size-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  SafeRoad AI
                </span>
              </div>
              <Stat label="Distance" value={`${saferoad.distanceKm} km`} />
              <Stat label="Est. time" value={`${saferoad.durationMin} min`} />
              <Stat
                label="Risk score"
                value={`${saferoad.riskScore}`}
                valueClass="text-risk-low"
              />
              <Stat
                label="High-risk segments"
                value={`${saferoad.highRiskSegments}`}
                valueClass="text-risk-low"
              />
            </div>
          </div>
        </Panel>

        {/* Highlights */}
        <div className="grid grid-cols-1 gap-3">
          <Highlight
            icon={<ShieldCheck className="size-4" />}
            accent="#16a34a"
            label="High-Risk Segments Avoided"
            value={`${ROUTE_COMPARISON.highRiskAvoided}`}
            sub="Dangerous crossings the AI route bypasses"
          />
          <Highlight
            icon={<TrendingUp className="size-4" />}
            accent="#2563eb"
            label="Estimated Safety Improvement"
            value={`+${ROUTE_COMPARISON.safetyImprovementPct}%`}
            sub="Lower predicted exposure vs fastest route"
          />
          <div className="grid grid-cols-2 gap-3">
            <Highlight
              icon={<Navigation className="size-4" />}
              accent="#8b98b3"
              label="Added Distance"
              value={`+${ROUTE_COMPARISON.addedDistanceKm} km`}
              compact
            />
            <Highlight
              icon={<Clock className="size-4" />}
              accent="#8b98b3"
              label="Added Time"
              value={`+${ROUTE_COMPARISON.addedTimeMin} min`}
              compact
            />
          </div>
        </div>

        <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
          The SafeRoad AI route trades{' '}
          <span className="text-foreground">
            {ROUTE_COMPARISON.addedTimeMin} extra minutes
          </span>{' '}
          to avoid {ROUTE_COMPARISON.highRiskAvoided} high-risk corridors —
          including the unsignalized Al-Farabi crossing — cutting predicted
          pedestrian risk by {ROUTE_COMPARISON.safetyImprovementPct}%.
        </p>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`font-mono text-sm font-semibold text-foreground ${valueClass ?? ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function Highlight({
  icon,
  accent,
  label,
  value,
  sub,
  compact,
}: {
  icon: React.ReactNode
  accent: string
  label: string
  value: string
  sub?: string
  compact?: boolean
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className="mt-1.5 font-mono text-2xl font-semibold"
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub && !compact ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </Panel>
  )
}
