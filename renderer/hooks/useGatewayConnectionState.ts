'use client'

import React from 'react'

import { subscribeGatewayErrors } from '@/domain/gateway/gateway-service'

export function useGatewayConnectionState() {
  const [gatewayError, setGatewayError] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      return subscribeGatewayErrors((message) => {
        setGatewayError(message)
      })
    } catch (error) {
      setGatewayError(error instanceof Error ? error.message : String(error))
      return
    }
  }, [])

  const clearGatewayError = React.useCallback(() => {
    setGatewayError(null)
  }, [])

  return {
    gatewayError,
    clearGatewayError,
  }
}
