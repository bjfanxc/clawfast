import { ChildProcess, spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import net from 'net'
import WebSocket from 'ws'

import { IPC_CHANNELS } from '../../shared/ipc'
import {
  isGatewayConnectChallengeEvent,
  isGatewayResponseFrame,
  parseGatewayMessage,
  type GatewayRequestFrame,
} from '../../shared/gateway'
import { buildDeviceAuthPayload, loadOrCreateDeviceIdentity, signDevicePayload } from '../utils/device-identity'
import { getGatewayToken } from '../utils/openclaw-config'
import {
  getBundledNodeRuntimePath,
  getOpenClawDir,
  getOpenClawEntryPath,
  isBundledNodeRuntimePresent,
  isOpenClawPresent,
} from '../utils/openclaw-paths'

type GatewayClientOptions = {
  port: number
  wsUrl: string
}

export class GatewayClient {
  private gatewayProcess: ChildProcess | null = null
  private gatewayWs: WebSocket | null = null
  private launchPromise: Promise<void> | null = null
  private shouldReconnect = true
  private pending = new Map<
    string,
    {
      resolve: (value: unknown | PromiseLike<unknown>) => void
      reject: (error: unknown) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()

  constructor(private readonly options: GatewayClientOptions) {}

  start() {
    this.shouldReconnect = true
    void this.connect()
  }

  stop() {
    this.shouldReconnect = false
    if (this.gatewayWs) {
      this.gatewayWs.removeAllListeners()
      this.gatewayWs.close()
      this.gatewayWs = null
    }

    if (this.gatewayProcess) {
      console.log('Killing Gateway process...')
      this.gatewayProcess.kill()
      this.gatewayProcess = null
    }

    this.flushPending(new Error('Gateway client stopped'))
  }

  restart() {
    this.stop()
    this.shouldReconnect = true
    void this.connect()
  }

  send(message: unknown) {
    if (!this.gatewayWs) return false
    if (this.gatewayWs.readyState !== WebSocket.OPEN) return false
    this.gatewayWs.send(this.serialize(message))
    return true
  }

  getReadyState() {
    return this.gatewayWs?.readyState ?? null
  }

  isConnected() {
    return this.gatewayWs?.readyState === WebSocket.OPEN
  }

  request<T = unknown>(method: string, params?: unknown, timeoutMs = 15_000): Promise<T> {
    if (!this.gatewayWs || this.gatewayWs.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Gateway not connected'))
    }

    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const frame: GatewayRequestFrame = {
      type: 'req',
      id,
      method,
      params,
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Gateway request timed out: ${method}`))
      }, timeoutMs)

      this.pending.set(id, {
        resolve: (value) => resolve(value as T | PromiseLike<T>),
        reject,
        timeout,
      })
      this.logGatewayFrame('OUT', frame)
      this.gatewayWs?.send(this.serialize(frame))
    })
  }

  private logGatewayFrame(direction: 'IN' | 'OUT', frame: unknown) {
    const prefix = `[Gateway ${direction}]`

    if (typeof frame === 'string') {
      try {
        const parsed = JSON.parse(frame) as unknown
        console.log(`${prefix}\n${JSON.stringify(parsed, null, 2)}`)
        return
      } catch {
        console.log(`${prefix} ${frame}`)
        return
      }
    }

    console.log(`${prefix}\n${JSON.stringify(frame, null, 2)}`)
  }

  private connect() {
    void this.connectInternal()
  }

  private async connectInternal() {
    if (this.gatewayWs && this.gatewayWs.readyState === WebSocket.OPEN) return

    await this.ensureGatewayAvailable()

    console.log(`Connecting to Gateway at ${this.options.wsUrl}...`)
    this.gatewayWs = new WebSocket(this.options.wsUrl, {
      headers: {
        Origin: `http://localhost:${this.options.port}`,
      },
    })

    let handshakeSent = false

    this.gatewayWs.on('open', () => {
      console.log('Connected to OpenClaw Gateway, waiting for connect.challenge...')
      handshakeSent = false
    })

    this.gatewayWs.on('message', async (data) => {
      const rawMessage = data.toString()
      this.logGatewayFrame('IN', rawMessage)

      try {
        const message = parseGatewayMessage(rawMessage)

        if (isGatewayConnectChallengeEvent(message)) {
          if (handshakeSent) {
            console.log('Handshake already sent for this connection, ignoring challenge.')
            return
          }

          const challengeNonce = message.payload?.nonce
          if (challengeNonce) {
            console.log('Received challenge nonce:', challengeNonce)
            handshakeSent = true
            await this.sendHandshake(challengeNonce)
          }
          return
        }

        if (isGatewayResponseFrame(message)) {
          const pending = this.pending.get(message.id)
          if (!pending) {
            return
          }

          clearTimeout(pending.timeout)
          this.pending.delete(message.id)

          if (message.ok) {
            pending.resolve(message.payload)
          } else {
            pending.reject(new Error(message.error?.message || 'Gateway request failed'))
          }
          return
        }

        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(IPC_CHANNELS.gateway.message, rawMessage)
        })
      } catch (error) {
        console.error('Error processing gateway message:', error)
      }
    })

    this.gatewayWs.on('error', (error) => {
      console.error('Gateway WebSocket error:', error)
    })

    this.gatewayWs.on('close', () => {
      console.log('Gateway WebSocket closed.')
      this.flushPending(new Error('Gateway WebSocket closed'))
      if (this.gatewayWs) {
        this.gatewayWs.removeAllListeners()
      }
      this.gatewayWs = null
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), 5000)
      }
    })
  }

  private async ensureGatewayAvailable() {
    if (!this.shouldManageBundledOpenClaw()) {
      return
    }

    if (await this.isPortOpen(this.options.port)) {
      return
    }

    if (this.gatewayProcess && !this.gatewayProcess.killed) {
      return
    }

    if (this.launchPromise) {
      await this.launchPromise
      return
    }

    this.launchPromise = this.launchBundledOpenClaw()

    try {
      await this.launchPromise
    } finally {
      this.launchPromise = null
    }
  }

  private shouldManageBundledOpenClaw() {
    const overrideUrl = process.env.OPENCLAW_WS_URL?.trim()
    if (overrideUrl) {
      return false
    }

    return /^ws:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(this.options.wsUrl)
  }

  private isPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port })

      const finalize = (value: boolean) => {
        socket.removeAllListeners()
        socket.destroy()
        resolve(value)
      }

      socket.once('connect', () => finalize(true))
      socket.once('error', () => finalize(false))
      socket.setTimeout(750, () => finalize(false))
    })
  }

  private async launchBundledOpenClaw() {
    if (!(await isOpenClawPresent())) {
      console.warn('Bundled OpenClaw not found, skipping managed launch.')
      return
    }

    if (!(await isBundledNodeRuntimePresent())) {
      console.warn('Bundled Node runtime not found, skipping managed launch.')
      return
    }

    const openClawDir = getOpenClawDir()
    const entryPath = getOpenClawEntryPath()
    const nodeRuntimePath = getBundledNodeRuntimePath()
    const args = [entryPath, 'gateway', '--port', String(this.options.port), '--allow-unconfigured']

    console.log(`Launching bundled OpenClaw from ${entryPath} with runtime ${nodeRuntimePath}...`)

    const child = spawn(nodeRuntimePath, args, {
      cwd: openClawDir,
      env: {
        ...process.env,
        OPENCLAW_NO_RESPAWN: '1',
        OPENCLAW_EMBEDDED_IN: 'ClawFast',
      },
      stdio: 'pipe',
      windowsHide: true,
    })

    this.gatewayProcess = child

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString().trim()
      if (text) {
        console.log(`[OpenClaw] ${text}`)
      }
    })

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString().trim()
      if (text) {
        console.error(`[OpenClaw] ${text}`)
      }
    })

    child.once('exit', (code, signal) => {
      console.log(`Bundled OpenClaw exited (code=${code}, signal=${signal})`)
      if (this.gatewayProcess === child) {
        this.gatewayProcess = null
      }
    })

    child.once('error', (error) => {
      console.error('Failed to launch bundled OpenClaw:', error)
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  private async sendHandshake(nonce: string) {
    if (!this.gatewayWs || this.gatewayWs.readyState !== WebSocket.OPEN) return

    const deviceIdentity = await loadOrCreateDeviceIdentity()
    const token = await getGatewayToken()

    if (!token) {
      console.warn('Warning: Gateway token not found in openclaw.json. Handshake may fail.')
    } else {
      console.log('Using Gateway Token:', token.substring(0, 8) + '...')
    }

    const role = 'operator'
    const scopes = ['operator.read', 'operator.write', 'operator.admin']
    const clientId = 'openclaw-control-ui'
    const clientMode = 'webchat'
    const signedAtMs = Date.now()

    const payload = buildDeviceAuthPayload({
      deviceId: deviceIdentity.deviceId,
      clientId,
      clientMode,
      role,
      scopes,
      signedAtMs,
      token,
      nonce,
    })

    const signature = await signDevicePayload(deviceIdentity.privateKey, payload)

    const handshakeRequest = {
      type: 'req',
      id: `req-connect-${Date.now()}`,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: clientId,
          version: '1.0.0',
          platform: process.platform,
          mode: clientMode,
        },
        role,
        scopes,
        caps: [],
        commands: [],
        permissions: {},
        auth: token ? { token } : undefined,
        locale: app.getLocale(),
        userAgent: `ClawFast/1.0.0 (${process.platform})`,
        device: {
          id: deviceIdentity.deviceId,
          publicKey: deviceIdentity.publicKey,
          signature,
          signedAt: signedAtMs,
          nonce,
        },
      },
    }

    console.log('Sending handshake with nonce:', nonce)
    this.logGatewayFrame('OUT', handshakeRequest)
    this.gatewayWs.send(JSON.stringify(handshakeRequest))
  }

  private serialize(message: unknown) {
    if (typeof message === 'string') return message
    if (message === undefined) return ''
    return JSON.stringify(message)
  }

  private flushPending(error: Error) {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
      this.pending.delete(id)
    }
  }
}
