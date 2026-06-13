'use client'

import {
  LayoutDashboard,
  Route,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ModuleId = 'dashboard' | 'routes' | 'explain' | 'upgrades'

const NAV: {
  id: ModuleId
  label: string
  desc: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: 'dashboard',
    label: 'City Dashboard',
    desc: 'Infrastructure overview',
    icon: LayoutDashboard,
  },
  {
    id: 'upgrades',
    label: 'Upgrade Planner',
    desc: 'Budget optimization',
    icon: Wrench,
  },
  {
    id: 'explain',
    label: 'Explainable AI',
    desc: 'Segment risk analysis',
    icon: ScanSearch,
  },
  {
    id: 'routes',
    label: 'Route Planner',
    desc: 'Safe vs fast routing',
    icon: Route,
  },
]

export function NavRail({
  active,
  onChange,
}: {
  active: ModuleId
  onChange: (id: ModuleId) => void
}) {
  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight text-foreground">
            SafeRoad AI
          </h1>
          <p className="text-xs leading-tight text-muted-foreground">
            Almaty · Pedestrian Intelligence
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Modules
        </p>
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-foreground ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground group-hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">
                  {item.label}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {item.desc}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-risk-low opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-risk-low" />
            </span>
            <span className="text-xs font-medium text-foreground">
              Live model: v4.2
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            1,240 segments monitored · last sync 4 min ago
          </p>
        </div>
      </div>
    </aside>
  )
}
