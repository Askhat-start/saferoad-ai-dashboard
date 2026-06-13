import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RISK_LABELS, type RiskLevel } from '@/lib/city-data'

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card/70 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  hint,
  icon,
  action,
}: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-primary">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            {title}
          </h3>
          {hint ? (
            <p className="text-xs leading-tight text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

const riskClasses: Record<RiskLevel, string> = {
  low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  medium: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
  high: 'bg-risk-high/15 text-risk-high border-risk-high/30',
}

export function RiskPill({
  level,
  score,
  className,
}: {
  level: RiskLevel
  score?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        riskClasses[level],
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          backgroundColor:
            level === 'low'
              ? '#16a34a'
              : level === 'medium'
                ? '#ca8a04'
                : '#dc2626',
        }}
      />
      {RISK_LABELS[level]}
      {typeof score === 'number' ? ` · ${score}` : ''} Risk
    </span>
  )
}

export function MetricTile({
  label,
  value,
  unit,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: ReactNode
  accent?: string
  icon?: ReactNode
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span className="text-muted-foreground" style={{ color: accent }}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="font-mono text-3xl font-semibold tracking-tight"
          style={{ color: accent }}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-sm text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </Panel>
  )
}
