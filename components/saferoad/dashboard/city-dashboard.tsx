'use client'

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Brain,
  Gauge,
  TrendingDown,
  Wrench,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CITY_STATS,
  DISTRICT_RISK,
  formatCurrency,
  RISK_DISTRIBUTION,
  SAFETY_TREND,
  SEGMENTS,
} from '@/lib/city-data'
import type { ModuleId } from '../nav-rail'
import { Panel, PanelHeader, RiskPill } from '../primitives'

const CAPABILITIES = [
  {
    icon: Brain,
    title: 'Infrastructure Risk Prediction',
    desc: 'ML models score every segment from sensor, traffic & accident telemetry.',
  },
  {
    icon: Gauge,
    title: 'Explainable AI Analysis',
    desc: 'SHAP-style attribution explains the drivers behind each risk score.',
  },
  {
    icon: Banknote,
    title: 'Budget-Aware Upgrade Planning',
    desc: 'Optimizer maximizes pedestrian safety gained per dollar invested.',
  },
]

function chartTooltip(
  active?: boolean,
  payload?: readonly any[],
  label?: string | number,
) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      {label ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.dataKey} className="text-muted-foreground">
          <span className="font-medium text-foreground">{p.name}:</span>{' '}
          {p.value}
        </p>
      ))}
    </div>
  )
}

export function CityDashboard({
  onNavigate,
}: {
  onNavigate: (m: ModuleId) => void
}) {
  const topDangerous = [...SEGMENTS]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)

  const gaugeData = [
    {
      name: 'score',
      value: CITY_STATS.safetyScore,
      fill: '#2563eb',
    },
  ]

  return (
    <div className="cmd-grid min-h-full p-6">
      {/* Capabilities banner */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon
          return (
            <Panel key={c.title} className="flex items-start gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                <Icon className="size-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {c.title}
                </h3>
                <p className="text-xs leading-snug text-muted-foreground">
                  {c.desc}
                </p>
              </div>
            </Panel>
          )
        })}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dangerous Segments
            </span>
            <AlertTriangle className="size-4 text-risk-high" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-risk-high">
              {CITY_STATS.dangerousSegments}
            </span>
            <span className="text-xs text-muted-foreground">
              / {CITY_STATS.totalSegments.toLocaleString()} monitored
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            High-risk pedestrian corridors flagged citywide
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk Reduction Potential
            </span>
            <TrendingDown className="size-4 text-risk-low" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-risk-low">
              {CITY_STATS.riskReductionPotential}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Estimated drop in pedestrian incidents if upgrades applied
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended Upgrades
            </span>
            <Wrench className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-foreground">
              {CITY_STATS.recommendedUpgrades}
            </span>
            <span className="text-xs text-muted-foreground">prioritized</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-ranked interventions across 5 districts
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Budget Optimization
            </span>
            <Banknote className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-semibold text-foreground">
              {formatCurrency(CITY_STATS.totalBudgetRequired)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Full upgrade program · {CITY_STATS.beneficiaries.toLocaleString()}{' '}
            residents benefited
          </p>
        </Panel>
      </div>

      {/* Main grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Safety score gauge */}
        <Panel className="lg:col-span-1">
          <PanelHeader
            title="City Safety Score"
            hint="Composite pedestrian safety index"
            icon={<Gauge className="size-4" />}
          />
          <div className="relative px-4 py-2">
            <ResponsiveContainer width="100%" height={210}>
              <RadialBarChart
                innerRadius="72%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={210}
                endAngle={-30}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: '#1e2535' }}
                  dataKey="value"
                  cornerRadius={12}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-5xl font-semibold text-foreground">
                {CITY_STATS.safetyScore}
              </span>
              <span className="text-xs text-muted-foreground">out of 100</span>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-risk-low/10 px-2 py-0.5 text-xs font-medium text-risk-low">
                <ArrowUpRight className="size-3" />+ {CITY_STATS.projectedSafetyScore -
                  CITY_STATS.safetyScore}{' '}
                projected after upgrades
              </span>
            </div>
          </div>
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Target (2026)</span>
              <span className="font-medium text-foreground">85 / 100</span>
            </div>
          </div>
        </Panel>

        {/* Safety trend */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="City Safety Score — 12-Month Trend"
            hint="Composite index trajectory"
          />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={232}>
              <AreaChart data={SAFETY_TREND} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e2535" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[40, 80]}
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  content={({ active, payload, label }) =>
                    chartTooltip(active, payload, label)
                  }
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Safety score"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#trendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Lower grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Risk distribution */}
        <Panel>
          <PanelHeader
            title="Risk Distribution"
            hint="All monitored segments"
          />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={RISK_DISTRIBUTION} margin={{ left: -20 }}>
                <CartesianGrid stroke="#1e2535" vertical={false} />
                <XAxis
                  dataKey="level"
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                  content={({ active, payload, label }) =>
                    chartTooltip(active, payload, label)
                  }
                />
                <Bar dataKey="count" name="Segments" radius={[6, 6, 0, 0]}>
                  {RISK_DISTRIBUTION.map((d) => (
                    <Cell key={d.level} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* District risk */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="District Risk Breakdown"
            hint="Segment risk levels by district"
          />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={DISTRICT_RISK}
                margin={{ left: -20 }}
                barCategoryGap="28%"
              >
                <CartesianGrid stroke="#1e2535" vertical={false} />
                <XAxis
                  dataKey="district"
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8b98b3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                  content={({ active, payload, label }) =>
                    chartTooltip(active, payload, label)
                  }
                />
                <Bar
                  dataKey="high"
                  stackId="a"
                  name="High"
                  fill="#dc2626"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="medium"
                  stackId="a"
                  name="Medium"
                  fill="#ca8a04"
                />
                <Bar
                  dataKey="low"
                  stackId="a"
                  name="Low"
                  fill="#16a34a"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Top dangerous segments */}
      <Panel className="mt-3">
        <PanelHeader
          title="Highest-Risk Segments Detected"
          hint="Ranked by predicted pedestrian risk score"
          icon={<AlertTriangle className="size-4" />}
          action={
            <button
              type="button"
              onClick={() => onNavigate('explain')}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Analyze segments
              <ArrowUpRight className="size-3" />
            </button>
          }
        />
        <div className="divide-y divide-border">
          {topDangerous.map((seg, i) => (
            <div
              key={seg.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {seg.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {seg.district} · {seg.dailyPedestrians.toLocaleString()} daily
                  pedestrians · {seg.accidents12mo} incidents / 12mo
                </p>
              </div>
              <div className="hidden w-40 sm:block">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${seg.riskScore}%`,
                      backgroundColor:
                        seg.level === 'high'
                          ? '#dc2626'
                          : seg.level === 'medium'
                            ? '#ca8a04'
                            : '#16a34a',
                    }}
                  />
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-foreground">
                {seg.riskScore}
              </span>
              <RiskPill level={seg.level} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
