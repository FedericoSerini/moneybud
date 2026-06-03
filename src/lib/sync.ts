import { v4 as uuidv4 } from 'uuid'

export interface JHLC {
  w: string
  l: number
  d: string
}

export interface CRDTOp {
  op_id: string
  doc_id: string
  field: string
  value: unknown
  ts: JHLC
  device_id: string
}

export interface SyncMessage {
  app_id: string
  user_id: string
  dataset_id: string
  clock: JHLC
  ops: CRDTOp[]
  client_schema_version: number
}

export interface SyncResponse {
  new_clock: JHLC
  ops: CRDTOp[]
  snapshot?: Record<string, unknown>
  schema_version: number
}

export interface DeviceCreds {
  device_id: string
  device_key_id: string
  device_secret: string
}

export const ZERO_HLC: JHLC = { w: '0', l: 0, d: '' }

export function tickHLC(current: JHLC, deviceId: string): JHLC {
  const now = BigInt(Date.now()) * 1_000_000n
  const currentW = BigInt(current.w)
  const w = now > currentW ? now : currentW
  const l = w === currentW ? current.l + 1 : 0
  return { w: w.toString(), l, d: deviceId }
}

export const DEVICE_CREDS_KEY = 'moneybud-device-creds'
export const SYNC_QUEUE_KEY = 'moneybud-sync-queue'
export const SYNC_CLOCK_KEY = 'moneybud-sync-clock'

export type MergeOpsFn = (ops: CRDTOp[]) => void

export class SyncEngine {
  private creds: DeviceCreds | null = null
  private clock: JHLC = ZERO_HLC
  private queue: CRDTOp[] = []
  private token = ''
  private userId = ''
  private appId = 'moneybud'
  private eventSource: EventSource | null = null
  private mergeOps: MergeOpsFn | null = null
  private flushing = false
  private readonly onlineHandler: () => void

  constructor() {
    this.onlineHandler = () => void this.flush()
    window.addEventListener('online', this.onlineHandler)
  }

  async init(token: string, userId: string, mergeOps: MergeOpsFn): Promise<SyncResponse> {
    this.token = token
    this.userId = userId
    this.mergeOps = mergeOps

    const credsRaw = localStorage.getItem(DEVICE_CREDS_KEY)
    this.creds = credsRaw ? (JSON.parse(credsRaw) as DeviceCreds) : null
    const clockRaw = localStorage.getItem(SYNC_CLOCK_KEY)
    this.clock = clockRaw ? (JSON.parse(clockRaw) as JHLC) : ZERO_HLC
    const queueRaw = localStorage.getItem(SYNC_QUEUE_KEY)
    this.queue = queueRaw ? (JSON.parse(queueRaw) as CRDTOp[]) : []

    if (!this.creds) {
      const deviceId = uuidv4()
      const res = await fetch('/api/sync/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: 'moneybud', device_id: deviceId }),
      })
      if (!res.ok) throw new Error('device registration failed')
      const { device_key_id, device_secret } = (await res.json()) as {
        device_key_id: string
        device_secret: string
      }
      this.creds = { device_id: deviceId, device_key_id, device_secret }
      localStorage.setItem(DEVICE_CREDS_KEY, JSON.stringify(this.creds))
    }

    const tokenRes = await fetch('/api/sync/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        device_key_id: this.creds.device_key_id,
        device_secret: this.creds.device_secret,
      }),
    })
    if (tokenRes.ok) {
      const body = (await tokenRes.json()) as { app_id?: string }
      if (body.app_id) this.appId = body.app_id
    } else {
      console.warn('sync token exchange failed:', tokenRes.status)
    }

    const snapshot = await this.pull()
    this.subscribeSSE()
    if (this.queue.length > 0) await this.flush()

    return snapshot
  }

  push(op: Omit<CRDTOp, 'ts' | 'device_id' | 'doc_id'>): void {
    if (!this.creds) return
    this.clock = tickHLC(this.clock, this.creds.device_id)
    const fullOp: CRDTOp = {
      ...op,
      doc_id: this.userId,
      ts: this.clock,
      device_id: this.creds.device_id,
    }
    this.queue.push(fullOp)
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
    if (navigator.onLine) void this.flush()
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0 || !this.creds || !navigator.onLine) return
    this.flushing = true
    const ops = [...this.queue]
    const msg: SyncMessage = {
      app_id: this.appId,
      user_id: this.userId,
      dataset_id: 'moneybud',
      clock: this.clock,
      ops,
      client_schema_version: 1,
    }
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: this.syncHeaders(),
      body: JSON.stringify(msg),
    })
    if (!res.ok) { this.flushing = false; return }
    const resp = (await res.json()) as SyncResponse
    this.clock = resp.new_clock
    localStorage.setItem(SYNC_CLOCK_KEY, JSON.stringify(this.clock))
    this.queue = this.queue.filter(q => !ops.includes(q))
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
    this.flushing = false
  }

  async pull(): Promise<SyncResponse> {
    const msg: SyncMessage = {
      app_id: this.appId,
      user_id: this.userId,
      dataset_id: 'moneybud',
      clock: this.clock,
      ops: [],
      client_schema_version: 1,
    }
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: this.syncHeaders(),
      body: JSON.stringify(msg),
    })
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)
    const resp = (await res.json()) as SyncResponse
    this.clock = resp.new_clock
    localStorage.setItem(SYNC_CLOCK_KEY, JSON.stringify(this.clock))
    return resp
  }

  private syncHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      'X-Device-Key-ID': this.creds!.device_key_id,
      'X-Device-Secret': this.creds!.device_secret,
    }
  }

  private subscribeSSE(): void {
    const url = new URL('/api/sync/events', window.location.origin)
    url.searchParams.set('token', this.token)
    url.searchParams.set('device_key_id', this.creds!.device_key_id)
    url.searchParams.set('device_secret', this.creds!.device_secret)
    this.eventSource = new EventSource(url.toString())
    this.eventSource.onmessage = () => {
      void this.pull().then(resp => {
        if (resp.ops.length > 0) this.mergeOps?.(resp.ops)
      })
    }
  }

  destroy(): void {
    this.eventSource?.close()
    window.removeEventListener('online', this.onlineHandler)
  }
}

