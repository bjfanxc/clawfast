export type ConfigSnapshot = {
  hash: string
  raw?: string | null
  config?: Record<string, unknown> | null
  valid?: boolean | null
  issues?: unknown[] | null
  updatedAt?: number | null
}

export type ConfigSetPayload = {
  raw: string
  baseHash: string
}
