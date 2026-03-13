'use client'

import React from 'react'

import {
  getGatewayConnectionState,
  subscribeGatewayErrors,
  subscribeGatewayMessages,
} from '@/domain/gateway/gateway-service'

export function useGatewayAvailability() {
  const [connected, setConnected] = React.useState<boolean | null>(null)
  const [checking, setChecking] = React.useState(false)

  const refreshGatewayState = React.useCallback(async () => {
    setChecking(true)
    try {
      const next = await getGatewayConnectionState()
      setConnected(next.connected)
      return next.connected
    } catch {
      setConnected(false)
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshGatewayState()

    const interval = window.setInterval(() => {
      void refreshGatewayState()
    }, 2500)

    let unsubscribeMessage: (() => void) | undefined
    let unsubscribeError: (() => void) | undefined

    try {
      unsubscribeMessage = subscribeGatewayMessages(() => {
        setConnected(true)
      })
    } catch {
      setConnected(false)
    }

    try {
      unsubscribeError = subscribeGatewayErrors(() => {
        setConnected(false)
      })
    } catch {
      setConnected(false)
    }

    return () => {
      window.clearInterval(interval)
      unsubscribeMessage?.()
      unsubscribeError?.()
    }
  }, [refreshGatewayState])

  return {
    gatewayConnected: connected === true,
    gatewayChecked: connected !== null,
    gatewayChecking: checking,
    refreshGatewayState,
  }
}
