'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  CITY_STATS,
  formatCurrency,
  UPGRADES,
  type Upgrade,
} from '@/lib/city-data'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Panel, PanelHeader } from '../primitives'

const BASE_SCORE = CITY_STATS.safetyScore
const TOTAL_REDUCTION = UPGRADES.reduce((s, u) => s + u.riskReduction, 0)
// scale: full program raises score from 62 -> 84
const SCORE_PER_POINT = (CITY_STATS.projectedSafetyScore - BASE_SCORE) / TOTAL_REDUCTION
const MAX_BUDGET = UPGRADES.reduce((s, u) => s + u.cost, 0)

const PRIORITY_STYLES: Record<Upgrade['priority'], string> = {
  critical: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  high: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
  medium: 'bg-primary/15 text-primary border-primary/30',
}

export function UpgradePlanner() {
  const [budget, setBudget] = useState(85000)

  const { selected, totalCost, totalReduction, beneficiaries, avgRoi } =
    useMemo(() => {
      // greedy optimizer: maximize risk reduction per dollar within budget
      const ranked = [...UPGRADES].sort(
        (a, b) => b.riskReduction / b.cost - a.riskReduction / a.cost,
      )
      const chosen = new Set<string>()
      let cost = 0
      for (const u of ranked) {
        if (cost + u.cost <= budget) {
          chosen.add(u.id)
          cost += u.cost
        }
      }
      const sel = UPGRADES.filter((u) => chosen.has(u.id))
      return {
        selected: chosen,
        totalCost: cost,
        totalReduction: sel.reduce((s, u) => s + u.riskReduction, 0),
        beneficiaries: sel.reduce((s, u) => s + u.beneficiaries, 0),
        avgRoi: sel.length
          ? sel.reduce((s, u) => s + u.roi, 0) / sel.length
          : 0,
      }
    }, [budget])

  const projectedScore = Math.min(
    100,
    Math.round(BASE_SCORE + totalReduction * SCORE_PER_POINT),
  )
  const scoreDelta = projectedScore - BASE_SCORE
  const fundedCount = selected.size

  const presets = [40000, 85000, 130000, MAX_BUDGET]

  return (
    <div className="cmd-grid min-h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Budget control + simulation */}
        <div className="space-y-3 xl:col-span-1">
          <Panel>
            <PanelHeader
              title="Investment Budget"
              hint="Set available capital for upgrades"
              icon={<Banknote className="size-4" />}
            />
            <div className="p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-semibold text-foreground">
                  {formatCurrency(budget)}
                </span>
                <span className="text-xs text-muted-foreground">allocated</span>
              </div>
              <div className="mt-4">
                <Slider
                  value={[budget]}
                  min={0}
                  max={MAX_BUDGET}
                  step={2500}
                  onValueChange={(v) =>
                    setBudget(Array.isArray(v) ? v[0] : v)
                  }
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>$0</span>
                  <span>{formatCurrency(MAX_BUDGET)} (full program)</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBudget(p)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      budget === p
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {formatCurrency(p)}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Before / After simulation */}
          <Panel>
            <PanelHeader
              title="Before / After Simulation"
              hint="Predicted city safety score"
              icon={<Sparkles className="size-4" />}
            />
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <ScoreBlock label="Current" score={BASE_SCORE} color="#8b98b3" />
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                <ScoreBlock
                  label="After upgrades"
                  score={projectedScore}
                  color="#16a34a"
                  highlight
                />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Safety index</span>
                  <span className="font-medium text-risk-low">
                    +{scoreDelta} pts
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/40"
                    style={{ width: `${BASE_SCORE}%` }}
                  />
                  <div
                    className="absolute inset-y-0 rounded-full bg-risk-low transition-all duration-500"
                    style={{
                      left: `${BASE_SCORE}%`,
                      width: `${scoreDelta}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Optimization results */}
          <div className="grid grid-cols-2 gap-3">
            <ResultTile
              label="Upgrades Funded"
              value={`${fundedCount}`}
              sub={`of ${UPGRADES.length}`}
            />
            <ResultTile
              label="Capital Used"
              value={formatCurrency(totalCost)}
              sub={`${Math.round((totalCost / (budget || 1)) * 100)}% of budget`}
            />
            <ResultTile
              label="Avg ROI"
              value={`${avgRoi.toFixed(1)}x`}
              accent="#16a34a"
              icon={<TrendingUp className="size-3.5" />}
            />
            <ResultTile
              label="Residents Served"
              value={beneficiaries.toLocaleString()}
              icon={<Users className="size-3.5" />}
            />
          </div>
        </div>

        {/* Recommendations table */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="AI-Recommended Upgrades"
            hint="Optimizer ranks interventions by safety gained per dollar"
            icon={<Sparkles className="size-4" />}
            action={
              <span className="rounded-full border border-risk-low/30 bg-risk-low/10 px-2.5 py-1 text-xs font-medium text-risk-low">
                {fundedCount} selected
              </span>
            }
          />
          <div className="grid grid-cols-12 gap-2 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="col-span-5">Segment / Intervention</span>
            <span className="col-span-2 text-right">Cost</span>
            <span className="col-span-2 text-right">Risk ↓</span>
            <span className="col-span-1 text-right">ROI</span>
            <span className="col-span-2 text-right">Priority</span>
          </div>
          <div className="divide-y divide-border">
            {[...UPGRADES]
              .sort(
                (a, b) =>
                  b.riskReduction / b.cost - a.riskReduction / a.cost,
              )
              .map((u) => {
                const isFunded = selected.has(u.id)
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors',
                      isFunded ? 'bg-risk-low/[0.06]' : 'opacity-55',
                    )}
                  >
                    <div className="col-span-5 flex items-center gap-2.5">
                      {isFunded ? (
                        <CheckCircle2 className="size-4 shrink-0 text-risk-low" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {u.segmentName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.intervention}
                        </p>
                      </div>
                    </div>
                    <span className="col-span-2 text-right font-mono text-sm text-foreground">
                      {formatCurrency(u.cost)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-sm font-semibold text-risk-low">
                      +{u.riskReduction}
                    </span>
                    <span className="col-span-1 text-right font-mono text-sm text-foreground">
                      {u.roi}x
                    </span>
                    <div className="col-span-2 flex justify-end">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                          PRIORITY_STYLES[u.priority],
                        )}
                      >
                        {u.priority}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">
              Optimizer maximizes total risk reduction subject to the budget
              constraint (0/1 knapsack heuristic).
            </span>
            <span className="font-mono font-semibold text-foreground">
              Σ {totalReduction} risk pts recovered
            </span>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ScoreBlock({
  label,
  score,
  color,
  highlight,
}: {
  label: string
  score: number
  color: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-lg border p-3 text-center',
        highlight ? 'border-risk-low/30 bg-risk-low/10' : 'border-border bg-secondary/40',
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-3xl font-semibold" style={{ color }}>
        {score}
      </p>
      <p className="text-[10px] text-muted-foreground">/ 100</p>
    </div>
  )
}

function ResultTile({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: React.ReactNode
}) {
  return (
    <Panel className="p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? <span style={{ color: accent }}>{icon}</span> : null}
      </div>
      <div
        className="mt-1 font-mono text-xl font-semibold text-foreground"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </Panel>
  )
}
