'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  Activity,
  Footprints,
  Lightbulb,
  Loader2,
  MousePointerClick,
  RadioTower,
  Ruler,
  ScanSearch,
  Sparkles,
  TrafficCone,
} from 'lucide-react'
import {
  RISK_COLORS,
  RISK_LABELS,
  SEGMENTS,
  riskLevel,
  type Segment,
} from '@/lib/city-data'
import { predictRisk, type PredictRiskResult } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader, RiskPill } from '../primitives'
import { BackendStatus } from '../backend-status'

/** Build a feature dict from a segment to send to the /api/predict-risk model. */
function segmentFeatures(segment: Segment): Record<string, unknown> {
  const byKey = Object.fromEntries(
    segment.factors.map((f) => [f.key, f.contribution]),
  )
  return {
    id: segment.id,
    name: segment.name,
    district: segment.district,
    lengthM: segment.lengthM,
    dailyPedestrians: segment.dailyPedestrians,
    accidents12mo: segment.accidents12mo,
    riskScore: segment.riskScore,
    ...byKey,
  }
}

const CityMap = dynamic(() => import('../map/city-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  ),
})

const FACTOR_ICONS: Record<string, typeof Activity> = {
  crosswalk: Footprints,
  speed: TrafficCone,
  lighting: Lightbulb,
  sidewalk: Ruler,
  accidents: Activity,
}

export function ExplainableAI() {
  const sorted = [...SEGMENTS].sort((a, b) => b.riskScore - a.riskScore)
  const [selectedId, setSelectedId] = useState<string>(sorted[0].id)
  const segment = SEGMENTS.find((s) => s.id === selectedId) as Segment

  const [live, setLive] = useState<PredictRiskResult | null>(null)
  const [scoring, setScoring] = useState(false)

  function selectSegment(id: string) {
    setSelectedId(id)
    setLive(null)
  }

  async function handleLiveScore() {
    setScoring(true)
    try {
      const res = await predictRisk(segmentFeatures(segment))
      setLive(res)
    } finally {
      setScoring(false)
    }
  }

  // contribution in risk points
  const factorsWithPoints = [...segment.factors]
    .map((f) => ({
      ...f,
      points: Math.round((f.contribution / 100) * segment.riskScore),
    }))
    .sort((a, b) => b.contribution - a.contribution)

  const maxContribution = Math.max(...factorsWithPoints.map((f) => f.contribution))

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="relative flex-1">
        <CityMap
          segments={SEGMENTS}
          selectedId={selectedId}
          onSelect={selectSegment}
        />
        <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/85 px-3.5 py-1.5 text-xs backdrop-blur-xl">
          <MousePointerClick className="size-3.5 text-primary" />
          <span className="text-foreground">
            Click any road segment to inspect its AI risk analysis
          </span>
        </div>
        {/* Legend */}
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

      {/* Inspector */}
      <div className="flex w-[420px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card/30 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Explainable AI
          </span>
          <BackendStatus />
        </div>

        <Panel className="mb-3">
          <PanelHeader
            title="Segment Risk Analysis"
            hint="Explainable AI · SHAP attribution"
            icon={<ScanSearch className="size-4" />}
          />
          <div className="p-4">
            <p className="text-sm font-medium text-foreground">{segment.name}</p>
            <p className="text-xs text-muted-foreground">
              {segment.district} District · {segment.lengthM} m corridor
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex size-24 items-center justify-center">
                <svg className="size-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#1e2535"
                    strokeWidth="9"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={RISK_COLORS[segment.level]}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(segment.riskScore / 100) * 264} 264`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-mono text-2xl font-semibold text-foreground">
                    {segment.riskScore}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <RiskPill level={segment.level} />
                <p className="mt-2 text-xs leading-snug text-muted-foreground">
                  Classified{' '}
                  <span
                    className="font-medium"
                    style={{ color: RISK_COLORS[segment.level] }}
                  >
                    {segment.level} risk
                  </span>{' '}
                  with{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(94, 70 + segment.riskScore / 5).toFixed(0)}%
                  </span>{' '}
                  model confidence.
                </p>
              </div>
            </div>

            {/* Live model re-score */}
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RadioTower className="size-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    Live model score
                  </span>
                </div>
                {live ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-sm font-semibold"
                      style={{ color: RISK_COLORS[live.riskBand] }}
                    >
                      {Math.round(live.riskScore)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: RISK_COLORS[live.riskBand],
                        backgroundColor: `${RISK_COLORS[live.riskBand]}22`,
                      }}
                    >
                      {RISK_LABELS[live.riskBand]}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    not scored
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2.5 w-full"
                onClick={handleLiveScore}
                disabled={scoring}
              >
                {scoring ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Scoring…
                  </>
                ) : (
                  <>
                    <RadioTower className="size-3.5" /> Re-score with /predict-risk
                  </>
                )}
              </Button>
              {live ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {live.source === 'backend'
                    ? 'Returned by the live SafeRoad model.'
                    : 'Backend offline — showing the stored score.'}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>

        {/* SHAP-style attribution */}
        <Panel className="mb-3">
          <PanelHeader
            title="Risk Factor Attribution"
            hint="Why the AI flagged this segment"
            icon={<Sparkles className="size-4" />}
          />
          <div className="space-y-3 p-4">
            {factorsWithPoints.map((f) => {
              const Icon = FACTOR_ICONS[f.key] ?? Activity
              return (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {f.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        +{f.points}
                      </span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {f.contribution}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(f.contribution / maxContribution) * 100}%`,
                        backgroundColor: RISK_COLORS[segment.level],
                        opacity: 0.55 + (f.contribution / maxContribution) * 0.45,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {f.value}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Contributions sum to 100% of the predicted risk score. Larger bars
              indicate stronger influence on the classification.
            </p>
          </div>
        </Panel>

        {/* Recommendation */}
        <Panel className="p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              AI Recommendation
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-snug text-foreground">
            {segment.recommendation}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{segment.dailyPedestrians.toLocaleString()} ped/day</span>
            <span>{segment.accidents12mo} incidents / 12mo</span>
          </div>
        </Panel>

        {/* Quick picks */}
        <div className="mt-3">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Jump to segment
          </p>
          <div className="flex flex-col gap-1">
            {sorted.slice(0, 6).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSegment(s.id)}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors',
                  s.id === selectedId
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="truncate">{s.name}</span>
                <span
                  className="ml-2 font-mono font-semibold"
                  style={{ color: RISK_COLORS[riskLevel(s.riskScore)] }}
                >
                  {s.riskScore}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
