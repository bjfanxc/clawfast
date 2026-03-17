'use client'

import React from 'react'
import { ChannelsView } from '@/components/channels'
import { ChatArea } from '@/components/chat'
import { CronView } from '@/components/cron'
import { Dashboard } from '@/components/dashboard'
import { ModelConfigView } from '@/components/models'
import { SessionsView } from '@/components/sessions'
import { GatewayRequiredState, LaunchSplash } from '@/components/shared'
import { Sidebar } from '@/components/sidebar'
import { SkillsView } from '@/components/skills'
import { UsageView } from '@/components/usage'
import { useGatewayAvailability } from '@/hooks/useGatewayAvailability'
import { useNavigationStore } from '@/store/navigation-store'

export default function Home() {
  const currentView = useNavigationStore((state) => state.currentView)
  const { gatewayConnected, gatewayChecked, gatewayChecking, refreshGatewayState } = useGatewayAvailability()
  const isProtectedView = currentView !== 'chat'
  const [gatewayHintDismissed, setGatewayHintDismissed] = React.useState(false)
  const [dashboardRefreshSignal, setDashboardRefreshSignal] = React.useState(0)
  const previousGatewayConnected = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    if (gatewayConnected) {
      setGatewayHintDismissed(false)
    }
  }, [gatewayConnected])

  React.useEffect(() => {
    if (
      previousGatewayConnected.current !== null &&
      previousGatewayConnected.current !== gatewayConnected
    ) {
      setDashboardRefreshSignal((value) => value + 1)
    }

    previousGatewayConnected.current = gatewayConnected
  }, [gatewayConnected])

  return (
    <div className="app-panel relative flex h-full min-h-0 w-full overflow-hidden">
      <LaunchSplash />
      <div className="shrink-0">
        <Sidebar />
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        {isProtectedView && !gatewayConnected && !gatewayHintDismissed ? (
          <div className="shrink-0 border-b border-border/60 bg-background px-6 pt-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <GatewayRequiredState
                compact
                checking={gatewayChecking || !gatewayChecked}
                onRefresh={() => void refreshGatewayState()}
                onDismiss={() => setGatewayHintDismissed(true)}
              />
            </div>
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          {currentView === 'dashboard' ? <Dashboard refreshSignal={dashboardRefreshSignal} /> : null}
          {currentView === 'skills' ? <SkillsView /> : null}
          {currentView === 'channels' ? <ChannelsView /> : null}
          {currentView === 'cron' ? <CronView /> : null}
          {currentView === 'sessions' ? <SessionsView /> : null}
          {currentView === 'usage' ? <UsageView /> : null}
          {currentView === 'models' ? <ModelConfigView /> : null}
          {currentView === 'chat' ? <ChatArea /> : null}
        </div>
      </div>
    </div>
  )
}
