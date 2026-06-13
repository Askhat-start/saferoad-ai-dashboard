'use client'

import { Activity, MapPin } from 'lucide-react'
import type { ModuleId } from './nav-rail'

const TITLES: Record<ModuleId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'City Infrastructure Command Center',
    subtitle: 'Real-time pedestrian risk intelligence across Almaty',
  },
  upgrades: {
    title: 'City Upgrade Planner',
    subtitle: 'Budget-optimized infrastructure investment recommendations',
  },
  explain: {
    title: 'Explainable AI · Risk Analysis',
    subtitle: 'Inspect why the model classifies a segment as dangerous',
  },
  routes: {
    title: 'Pedestrian Route Planner',
    subtitle: 'Fastest route vs SafeRoad AI risk-minimized route',
  },
}

export function TopBar({ active }: { active: ModuleId }) {
  const { title, subtitle } = TITLES[active]
  return (
    <header className="flex items-center justify-between border-b border-border bg-card/40 px-6 py-3.5 backdrop-blur-xl">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground text-balance">
            {title}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 md:flex">
          <MapPin className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Almaty, KZ
          </span>
          <span className="text-xs text-muted-foreground">43.24°N, 76.89°E</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-risk-low/30 bg-risk-low/10 px-3 py-1.5">
          <Activity className="size-3.5 text-risk-low" />
          <span className="text-xs font-medium text-risk-low">
            Telemetry Live
          </span>
        </div>
      </div>
    </header>
  )
}
