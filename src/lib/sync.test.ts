import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tickHLC, ZERO_HLC, type JHLC, SyncEngine, DEVICE_CREDS_KEY, SYNC_QUEUE_KEY, SYNC_CLOCK_KEY } from './sync'

describe('tickHLC', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000) // ms (realistic Unix time)
  })

  it('uses system clock when ahead of prev', () => {
    const result = tickHLC({ w: '0', l: 0, d: 'a' }, 'b')
    // 1_000_000_000_000 ms × 1_000_000 ns/ms = 1_000_000_000_000_000_000 ns
    expect(result.w).toBe('1000000000000000000')
    expect(result.l).toBe(0)
    expect(result.d).toBe('b')
  })

  it('increments logical counter when wall time ties', () => {
    const prev: JHLC = { w: '1000000000000000000', l: 3, d: 'a' }
    const result = tickHLC(prev, 'b')
    expect(result.w).toBe('1000000000000000000')
    expect(result.l).toBe(4)
  })

  it('preserves prev wall time when clock goes backwards', () => {
    const prev: JHLC = { w: '9999999999999999999', l: 0, d: 'a' }
    const result = tickHLC(prev, 'b')
    expect(result.w).toBe('9999999999999999999')
    expect(result.l).toBe(1)
  })

  it('ZERO_HLC has w=0 l=0 d=empty', () => {
    expect(ZERO_HLC).toEqual({ w: '0', l: 0, d: '' })
  })
})

const FAKE_CREDS = { device_id: 'dev-1', device_key_id: 'dkid-1', device_secret: 'dsec-1' }

function makeEventSourceStub() {
  return class {
    onmessage: null | (() => void) = null
    onerror: null | (() => void) = null
    close() {}
  }
}

describe('SyncEngine.init — first login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('EventSource', makeEventSourceStub())
  })

  it('registers device, exchanges token, pulls snapshot', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ device_key_id: 'dkid-1', device_secret: 'dsec-1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ app_id: 'moneybud', user_id: 'u1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ new_clock: ZERO_HLC, ops: [], schema_version: 1 }) })
    vi.stubGlobal('fetch', fetchMock)

    const engine = new SyncEngine()
    await engine.init('tok', 'u1', vi.fn())
    engine.destroy()

    const creds = JSON.parse(localStorage.getItem(DEVICE_CREDS_KEY)!)
    expect(creds.device_key_id).toBe('dkid-1')

    const registerCall = fetchMock.mock.calls[0]
    expect(registerCall[0]).toContain('/api/sync/register')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('SyncEngine.init — returning device', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(DEVICE_CREDS_KEY, JSON.stringify(FAKE_CREDS))
    vi.stubGlobal('EventSource', makeEventSourceStub())
  })

  it('skips registration when creds already stored', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ app_id: 'moneybud', user_id: 'u1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ new_clock: ZERO_HLC, ops: [], schema_version: 1 }) })
    vi.stubGlobal('fetch', fetchMock)

    const engine = new SyncEngine()
    await engine.init('tok', 'u1', vi.fn())
    engine.destroy()

    const allUrls = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(allUrls.some((u: string) => u.includes('register'))).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('SyncEngine.push + flush', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(DEVICE_CREDS_KEY, JSON.stringify(FAKE_CREDS))
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('enqueues op and flushes to /api/sync when online', async () => {
    const flushResp = { new_clock: { w: '1000', l: 0, d: 'dev-1' }, ops: [], schema_version: 1 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => flushResp }))

    const engine = new SyncEngine()
    ;(engine as any).creds = FAKE_CREDS
    ;(engine as any).userId = 'u1'
    ;(engine as any).token = 'tok'

    engine.push({ op_id: 'op-1', field: 'securities', value: [] })
    await new Promise(r => setTimeout(r, 10))

    expect(JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)!)).toEqual([])
    expect(JSON.parse(localStorage.getItem(SYNC_CLOCK_KEY)!).w).toBe('1000')
    engine.destroy()
  })

  it('keeps ops in queue when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal('fetch', vi.fn())

    const engine = new SyncEngine()
    ;(engine as any).creds = FAKE_CREDS
    ;(engine as any).userId = 'u1'
    ;(engine as any).token = 'tok'

    engine.push({ op_id: 'op-2', field: 'fixedExpenses', value: [] })

    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)!)
    expect(queue).toHaveLength(1)
    expect(queue[0].field).toBe('fixedExpenses')
    engine.destroy()
  })
})
