'use client'

import { useState } from 'react'
import { CityDashboard } from './dashboard/city-dashboard'
import { ExplainableAI } from './explain/explainable-ai'
import { NavRail, type ModuleId } from './nav-rail'
import { RoutePlanner } from './route/route-planner'
import { TopBar } from './top-bar'
import { UpgradePlanner } from './upgrade/upgrade-planner'

export function AppShell() {
  const [active, setActive] = useState<ModuleId>('dashboard')

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <NavRail active={active} onChange={setActive} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar active={active} />
        <main className="min-h-0 flex-1 overflow-hidden">
          {active === 'dashboard' && (
            <div className="h-full overflow-y-auto">
              <CityDashboard onNavigate={setActive} />
            </div>
          )}
          {active === 'upgrades' && <UpgradePlanner />}
          {active === 'explain' && <ExplainableAI />}
          {active === 'routes' && <RoutePlanner />}
        </main>
      </div>
    </div>
  )
}
