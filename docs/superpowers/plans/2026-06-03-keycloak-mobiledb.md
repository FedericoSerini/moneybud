# moneybud — Keycloak + mobile-db Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Keycloak OIDC hard-gate authentication and mobile-db CRDT sync to moneybud, replacing localStorage as the source of truth with offline-first multi-device sync.

**Architecture:** Keycloak init blocks React mount — app only renders when authenticated. All AppState mutations generate CRDT ops that queue locally (localStorage) and flush to mobile-db via an Express proxy that handles CBOR+zstd encoding/decoding. SSE from mobile-db drives real-time delta pull on other-device changes. No changes to mutation method signatures — op push happens via a `useEffect` that diffs state after every commit.

**Tech Stack:** `keycloak-js`, `cbor-x`, `@mongodb-js/zstd`, `dotenv`, `vitest`, `@testing-library/react`

---

## File Map

**New files:**
```
src/lib/keycloak.ts          — Keycloak singleton (url/realm/clientId config)
src/lib/sync.ts              — JHLC type, CRDTOp, SyncMessage, SyncResponse, SyncEngine class
src/context/AuthContext.tsx  — AuthProvider (token refresh loop) + useAuth hook
src/lib/keycloak.test.ts     — singleton config test
src/lib/sync.test.ts         — HLC + SyncEngine unit tests
src/test-setup.ts            — @testing-library/jest-dom import
.env                         — VITE_KEYCLOAK_URL, MOBILE_DB_URL
.env.example                 — same keys, no values
```

**Modified files:**
```
src/main.tsx                 — await keycloak.init() before ReactDOM.createRoot
src/App.tsx                  — wrap with <AuthProvider>; remove /welcome route
src/context/AppContext.tsx   — remove loadState/localStorage save/migrate; add SyncEngine
                               lifecycle, mergeRemoteOps, prevStateRef op-push effect
server/index.js              — import dotenv; add 4 proxy routes + helper fns
package.json                 — add keycloak-js, vitest, @testing-library/*
vite.config.ts               — add test: { environment: 'jsdom', setupFiles }
```

---

## Phase 1 — Keycloak Auth

### Task 1: Test infrastructure + Keycloak singleton

**Files:**
- Create: `src/lib/keycloak.ts`, `src/lib/keycloak.test.ts`, `src/test-setup.ts`
- Modify: `package.json`, `vite.config.ts`, `.gitignore`
- Create: `.env`, `.env.example`

- [ ] **Step 1.1: Install frontend deps**

```bash
cd /Users/federicoserini/ws/moneybud
npm install keycloak-js
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: no errors.

- [ ] **Step 1.2: Add vitest config to vite.config.ts**

Full replacement of `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 1.3: Create src/test-setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 1.4: Add test scripts to package.json**

In the `"scripts"` block, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 1.5: Create .env**

```
VITE_KEYCLOAK_URL=https://gatekeeper.federicoserini.com
MOBILE_DB_URL=http://localhost:8443
```

- [ ] **Step 1.6: Create .env.example**

```
VITE_KEYCLOAK_URL=https://your-keycloak-host
MOBILE_DB_URL=http://localhost:8443
```

- [ ] **Step 1.7: Ensure .env is gitignored**

```bash
grep -q '^\.env$' .gitignore || echo '.env' >> .gitignore
```

- [ ] **Step 1.8: Write failing test for keycloak singleton**

Create `src/lib/keycloak.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('keycloak-js', () => ({
  default: vi.fn().mockImplementation((config: unknown) => ({ _config: config })),
}))

describe('keycloak singleton', () => {
  it('is configured with master realm and moneybud clientId', async () => {
    const { default: keycloak } = await import('./keycloak')
    expect((keycloak as any)._config.realm).toBe('master')
    expect((keycloak as any)._config.clientId).toBe('moneybud')
  })
})
```

- [ ] **Step 1.9: Run test — expect FAIL**

```bash
npx vitest run src/lib/keycloak.test.ts
```

Expected: FAIL — `Cannot find module './keycloak'`

- [ ] **Step 1.10: Create src/lib/keycloak.ts**

```ts
import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: 'master',
  clientId: 'moneybud',
})

export default keycloak
```

- [ ] **Step 1.11: Run test — expect PASS**

```bash
npx vitest run src/lib/keycloak.test.ts
```

Expected: PASS

- [ ] **Step 1.12: Commit**

```bash
git add src/lib/keycloak.ts src/lib/keycloak.test.ts src/test-setup.ts \
        vite.config.ts package.json package-lock.json .env.example
git commit -m "feat: add Keycloak singleton and Vitest infrastructure"
```

---

### Task 2: AuthContext + main.tsx hard gate

**Files:**
- Create: `src/context/AuthContext.tsx`, `src/context/AuthContext.test.tsx`
- Modify: `src/main.tsx`, `src/App.tsx`

- [ ] **Step 2.1: Write failing test for AuthContext**

Create `src/context/AuthContext.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../lib/keycloak', () => ({
  default: {
    token: 'test-token',
    tokenParsed: { sub: 'user-123' },
    logout: vi.fn(),
    updateToken: vi.fn().mockResolvedValue(false),
  },
}))

function Consumer() {
  const { token, userId } = useAuth()
  return <div data-testid="out">{token}:{userId}</div>
}

describe('AuthContext', () => {
  it('provides token and userId from keycloak', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('out').textContent).toBe('test-token:user-123')
  })
})
```

- [ ] **Step 2.2: Run test — expect FAIL**

```bash
npx vitest run src/context/AuthContext.test.tsx
```

Expected: FAIL — `Cannot find module './AuthContext'`

- [ ] **Step 2.3: Create src/context/AuthContext.tsx**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import keycloak from '../lib/keycloak'

interface AuthState {
  token: string
  userId: string
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(keycloak.token ?? '')
  const userId = keycloak.tokenParsed?.sub ?? ''

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(60)
        if (refreshed) setToken(keycloak.token ?? '')
      } catch {
        keycloak.logout()
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <AuthContext.Provider value={{ token, userId, logout: () => keycloak.logout() }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 2.4: Run test — expect PASS**

```bash
npx vitest run src/context/AuthContext.test.tsx
```

Expected: PASS

- [ ] **Step 2.5: Update src/main.tsx**

Full replacement:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import keycloak from './lib/keycloak'

keycloak
  .init({ onLoad: 'login-required', pkceMethod: 'S256' })
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
```

- [ ] **Step 2.6: Update src/App.tsx**

Full replacement (removes `/welcome` route — Keycloak handles the pre-auth landing):

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { Portfolio } from './components/portfolio/Portfolio'
import { Expenses } from './components/expenses/Expenses'
import { Assets } from './components/assets/Assets'
import { Pension } from './components/pension/Pension'
import { FinancialAdvice } from './components/advice/FinancialAdvice'
import { Settings } from './components/settings/Settings'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/spese" element={<Expenses />} />
                    <Route path="/asset" element={<Assets />} />
                    <Route path="/pensione" element={<Pension />} />
                    <Route path="/consigli" element={<FinancialAdvice />} />
                    <Route path="/impostazioni" element={<Settings />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
```

- [ ] **Step 2.7: Run tsc to check types**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.8: Commit**

```bash
git add src/context/AuthContext.tsx src/context/AuthContext.test.tsx \
        src/main.tsx src/App.tsx
git commit -m "feat: add AuthContext and Keycloak PKCE hard gate in main.tsx"
```

---

## Phase 2 — Express Proxy

### Task 3: Server deps + env loading

**Files:**
- Modify: `server/index.js`, `package.json`

- [ ] **Step 3.1: Install server deps**

```bash
npm install dotenv cbor-x @mongodb-js/zstd
```

`@mongodb-js/zstd` compiles native bindings — takes ~30s on first install. Expected: no errors.

- [ ] **Step 3.2: Add dotenv import at top of server/index.js**

Insert as the very first line of `server/index.js`:

```js
import 'dotenv/config'
```

- [ ] **Step 3.3: Add helpers + MOBILE_DB_URL after existing imports**

After all existing `import` lines and before `const app = express()`, add:

```js
import { encode, decode } from 'cbor-x'
import { compress, decompress } from '@mongodb-js/zstd'

const MOBILE_DB_URL = process.env.MOBILE_DB_URL ?? 'http://localhost:8443'

function hlcToCbor(hlc) {
  return { w: BigInt(hlc.w), l: hlc.l, d: hlc.d }
}

function hlcToJson(hlc) {
  return { w: hlc.w.toString(), l: hlc.l, d: hlc.d }
}

function jsonBodyToCbor(msg) {
  return {
    ...msg,
    clock: hlcToCbor(msg.clock),
    ops: (msg.ops ?? []).map(op => ({ ...op, ts: hlcToCbor(op.ts) })),
  }
}

function cborResponseToJson(resp) {
  return {
    ...resp,
    new_clock: hlcToJson(resp.new_clock),
    ops: (resp.ops ?? []).map(op => ({ ...op, ts: hlcToJson(op.ts) })),
  }
}
```

- [ ] **Step 3.4: Commit**

```bash
git add server/index.js package.json package-lock.json
git commit -m "feat: add cbor-x, zstd, dotenv to Express; add CBOR helper fns"
```

---

### Task 4: Register + token proxy routes

**Files:**
- Modify: `server/index.js`

- [ ] **Step 4.1: Add POST /api/sync/register**

Before `app.listen(...)` at the bottom of `server/index.js`, add:

```js
app.post('/api/sync/register', async (req, res) => {
  try {
    const upstream = await fetch(`${MOBILE_DB_URL}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 4.2: Add POST /api/sync/token**

```js
app.post('/api/sync/token', async (req, res) => {
  try {
    const upstream = await fetch(`${MOBILE_DB_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 4.3: Smoke-test register route (requires mobile-db running)**

```bash
npm run dev:server &

curl -s -X POST http://localhost:3001/api/sync/register \
  -H 'Content-Type: application/json' \
  -d '{"app_id":"moneybud","device_id":"smoke-test-001"}' | jq .
```

Expected: `{"device_key_id":"...","device_secret":"..."}`

- [ ] **Step 4.4: Commit**

```bash
git add server/index.js
git commit -m "feat: add /api/sync/register and /api/sync/token Express routes"
```

---

### Task 5: Sync CBOR+zstd proxy route

**Files:**
- Modify: `server/index.js`

- [ ] **Step 5.1: Add POST /api/sync**

```js
app.post('/api/sync', async (req, res) => {
  const deviceKeyId = req.headers['x-device-key-id']
  const deviceSecret = req.headers['x-device-secret']
  if (!deviceKeyId || !deviceSecret) {
    return res.status(401).json({ error: 'missing device credentials' })
  }

  try {
    const cborPayload = jsonBodyToCbor(req.body)
    const cborEncoded = Buffer.from(encode(cborPayload))
    const compressed = await compress(cborEncoded)

    const upstream = await fetch(`${MOBILE_DB_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor+zstd',
        'X-Device-Key': `${deviceKeyId}:${deviceSecret}`,
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: compressed,
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: await upstream.text() })
    }

    const responseBuffer = Buffer.from(await upstream.arrayBuffer())
    const decompressed = await decompress(responseBuffer)
    const decoded = decode(decompressed)

    res.json(cborResponseToJson(decoded))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 5.2: Smoke-test sync route**

Use device_key_id + device_secret from Task 4.3 smoke test. Replace `<dkid>`, `<dsec>`, `<jwt>`:

```bash
curl -s -X POST http://localhost:3001/api/sync \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Key-ID: <dkid>' \
  -H 'X-Device-Secret: <dsec>' \
  -H 'Authorization: Bearer <jwt>' \
  -d '{"app_id":"moneybud","user_id":"test","dataset_id":"moneybud","clock":{"w":"0","l":0,"d":""},"ops":[],"client_schema_version":1}' | jq .
```

Expected: `{"new_clock":{"w":"...","l":0,"d":""},"ops":[],"schema_version":1}`

- [ ] **Step 5.3: Commit**

```bash
git add server/index.js
git commit -m "feat: add /api/sync CBOR+zstd proxy route"
```

---

### Task 6: SSE proxy route

**Files:**
- Modify: `server/index.js`

- [ ] **Step 6.1: Add GET /api/sync/events**

```js
app.get('/api/sync/events', async (req, res) => {
  const { token, device_key_id, device_secret } = req.query
  if (!token || !device_key_id || !device_secret) {
    return res.status(401).send('missing credentials')
  }

  let upstream
  try {
    upstream = await fetch(`${MOBILE_DB_URL}/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Device-Key': `${device_key_id}:${device_secret}`,
      },
    })
  } catch {
    return res.status(502).send('upstream unreachable')
  }

  if (!upstream.ok) {
    return res.status(upstream.status).send('upstream error')
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()

  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
    } catch {
      // client disconnected
    } finally {
      res.end()
    }
  }

  pump()
  req.on('close', () => reader.cancel())
})
```

- [ ] **Step 6.2: Commit**

```bash
git add server/index.js
git commit -m "feat: add /api/sync/events SSE proxy route"
```

---

## Phase 3 — SyncEngine

### Task 7: CRDT types + HLC

**Files:**
- Create: `src/lib/sync.ts`, `src/lib/sync.test.ts`

- [ ] **Step 7.1: Write failing HLC tests**

Create `src/lib/sync.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tickHLC, ZERO_HLC, type JHLC } from './sync'

describe('tickHLC', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000) // ms
  })

  it('uses system clock when ahead of prev', () => {
    const result = tickHLC({ w: '0', l: 0, d: 'a' }, 'b')
    // 1_000_000 ms × 1_000_000 = 1_000_000_000_000_000_000 ns
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
```

- [ ] **Step 7.2: Run test — expect FAIL**

```bash
npx vitest run src/lib/sync.test.ts
```

Expected: FAIL — `Cannot find module './sync'`

- [ ] **Step 7.3: Create src/lib/sync.ts — types + HLC only**

```ts
import { v4 as uuidv4 } from 'uuid'

// ─── Types ────────────────────────────────────────────────────────────────────

// w is nanoseconds as decimal string — avoids BigInt JSON serialization issues
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

// ─── HLC ──────────────────────────────────────────────────────────────────────

export const ZERO_HLC: JHLC = { w: '0', l: 0, d: '' }

export function tickHLC(current: JHLC, deviceId: string): JHLC {
  const now = BigInt(Date.now()) * 1_000_000n
  const currentW = BigInt(current.w)
  const w = now > currentW ? now : currentW
  const l = w === currentW ? current.l + 1 : 0
  return { w: w.toString(), l, d: deviceId }
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const DEVICE_CREDS_KEY = 'moneybud-device-creds'
export const SYNC_QUEUE_KEY = 'moneybud-sync-queue'
export const SYNC_CLOCK_KEY = 'moneybud-sync-clock'

export type { uuidv4 }
```

Wait — remove the last line (`export type { uuidv4 }`) — that's wrong. The file just exports from uuid internally. Here is the corrected final file — replace the above entirely with:

```ts
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
```

- [ ] **Step 7.4: Run test — expect PASS**

```bash
npx vitest run src/lib/sync.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 7.5: Commit**

```bash
git add src/lib/sync.ts src/lib/sync.test.ts
git commit -m "feat: add CRDT types, HLC, storage key constants"
```

---

### Task 8: SyncEngine class

**Files:**
- Modify: `src/lib/sync.ts`, `src/lib/sync.test.ts`

- [ ] **Step 8.1: Write failing SyncEngine tests**

Append to `src/lib/sync.test.ts`:

```ts
import { SyncEngine } from './sync'

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

    const allUrls = fetchMock.mock.calls.map((c: unknown[]) => c[0])
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
```

- [ ] **Step 8.2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/sync.test.ts
```

Expected: FAIL — `SyncEngine is not a constructor`

- [ ] **Step 8.3: Append SyncEngine class to src/lib/sync.ts**

```ts
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
    if (this.queue.length === 0 || !this.creds || !navigator.onLine) return
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
    if (!res.ok) return
    const resp = (await res.json()) as SyncResponse
    this.clock = resp.new_clock
    localStorage.setItem(SYNC_CLOCK_KEY, JSON.stringify(this.clock))
    this.queue = this.queue.filter(q => !ops.includes(q))
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue))
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
```

- [ ] **Step 8.4: Run all sync tests — expect PASS**

```bash
npx vitest run src/lib/sync.test.ts
```

Expected: all PASS

- [ ] **Step 8.5: Commit**

```bash
git add src/lib/sync.ts src/lib/sync.test.ts
git commit -m "feat: implement SyncEngine (init, push, flush, pull, SSE)"
```

---

## Phase 4 — AppContext Refactor

### Task 9: Wire SyncEngine into AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 9.1: Update imports at top of AppContext.tsx**

Replace the existing react import line:

```ts
import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from 'react'
```

After the uuid import, add:

```ts
import { SyncEngine, type CRDTOp, type MergeOpsFn, ZERO_HLC } from '../lib/sync'
import { useAuth } from './AuthContext'
```

- [ ] **Step 9.2: Delete loadState, migrate, STORAGE_KEY**

Remove:
- The `const STORAGE_KEY = 'moneybud-state'` constant
- The entire `function migrate(raw: any): AppState { ... }` function  
- The entire `function loadState(): AppState { ... }` function

- [ ] **Step 9.3: Replace useState initialization**

Change:
```ts
const [state, setState] = useState<AppState>(loadState)
```

To:
```ts
const [state, setState] = useState<AppState>(DEFAULT_STATE)
```

- [ ] **Step 9.4: Remove localStorage save effect**

Delete the entire effect:
```ts
useEffect(() => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}, [state])
```

- [ ] **Step 9.5: Add sync refs and mergeRemoteOps inside AppProvider**

Immediately after the `useState` line, insert:

```ts
const { token, userId } = useAuth()
const engineRef = useRef<SyncEngine | null>(null)
const isInitializedRef = useRef(false)
const isMergingRef = useRef(false)
const prevStateRef = useRef<AppState>(DEFAULT_STATE)

const SYNC_FIELDS = [
  'securities', 'fixedExpenses', 'variableExpenses', 'variableIncomes',
  'assets', 'pensions', 'pacPlans', 'bonds', 'settings', 'wealthHistory', 'alertDismissals',
] as const

type SyncField = (typeof SYNC_FIELDS)[number]

const mergeRemoteOps = useCallback<MergeOpsFn>((ops: CRDTOp[]) => {
  isMergingRef.current = true
  setState(prev => {
    let next = prev
    for (const op of ops) {
      if ((SYNC_FIELDS as readonly string[]).includes(op.field)) {
        next = { ...next, [op.field]: op.value }
      }
    }
    return next
  })
}, [])
```

- [ ] **Step 9.6: Add SyncEngine lifecycle effect**

After `mergeRemoteOps`, insert:

```ts
useEffect(() => {
  if (!token || !userId) return
  const engine = new SyncEngine()
  engineRef.current = engine

  engine
    .init(token, userId, mergeRemoteOps)
    .then(snapshot => {
      isMergingRef.current = true
      setState(prev => {
        let next = prev
        for (const op of snapshot.ops) {
          if ((SYNC_FIELDS as readonly string[]).includes(op.field)) {
            next = { ...next, [op.field]: op.value }
          }
        }
        if (snapshot.snapshot) {
          next = { ...DEFAULT_STATE, ...(snapshot.snapshot as Partial<AppState>) }
        }
        return next
      })
      isInitializedRef.current = true
      prevStateRef.current = state
    })
    .catch(console.error)

  return () => {
    engine.destroy()
    engineRef.current = null
    isInitializedRef.current = false
  }
}, [token, userId, mergeRemoteOps])
```

- [ ] **Step 9.7: Add op-push effect**

After the lifecycle effect, insert:

```ts
useEffect(() => {
  if (!isInitializedRef.current) return
  if (isMergingRef.current) {
    isMergingRef.current = false
    prevStateRef.current = state
    return
  }
  const prev = prevStateRef.current
  prevStateRef.current = state

  for (const field of SYNC_FIELDS) {
    if (state[field] !== prev[field]) {
      engineRef.current?.push({
        op_id: crypto.randomUUID(),
        field,
        value: state[field],
      })
    }
  }
}, [state])
```

- [ ] **Step 9.8: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. The `ZERO_HLC` import may be unused — remove it from the import if tsc warns.

- [ ] **Step 9.9: Run all tests**

```bash
npx vitest run
```

Expected: all PASS (keycloak singleton + AuthContext + HLC + SyncEngine)

- [ ] **Step 9.10: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: wire SyncEngine into AppContext; remove localStorage persistence"
```

---

### Task 10: Keycloak client setup + end-to-end verification

**Files:** none (manual + verification)

- [ ] **Step 10.1: Create Keycloak client**

1. Open `https://gatekeeper.federicoserini.com` → Admin Console
2. Select realm: `master`
3. Clients → Create client
4. Fill in:

| Field | Value |
|---|---|
| Client ID | `moneybud` |
| Name | `Moneybud` |
| Client authentication | OFF |
| Authorization | OFF |
| Standard flow | checked |
| Root URL | `http://localhost:5173` |
| Valid redirect URIs | `http://localhost:5173/*` |
| Valid post logout redirect URIs | `http://localhost:5173` |
| Web origins | `http://localhost:5173` |

5. Save → Advanced tab → find "Proof Key for Code Exchange Code Challenge Method" → select `S256` → Save

- [ ] **Step 10.2: (Optional) restrict mobile-db to moneybud client**

In mobile-db deployment env, add:
```
KEYCLOAK_CLIENT_ID=moneybud
```
This makes mobile-db reject JWTs whose `azp` claim ≠ `moneybud`. Leave unset to accept any client.

- [ ] **Step 10.3: Start services**

Terminal 1 — mobile-db (local):
```bash
cd ~/ws/mobile-db
CRSQLITE_EXT_PATH=./crsqlite.dylib \
DATA_DIR=./data \
ADMIN_PASSWORD_HASH="<your-hash>" \
DB_ENCRYPTION_KEY="<your-key>" \
KEYCLOAK_URL=https://gatekeeper.federicoserini.com \
KEYCLOAK_REALM=master \
go run ./...
```

Terminal 2 — moneybud:
```bash
cd ~/ws/moneybud
npm run dev
```

- [ ] **Step 10.4: Auth flow verification**

1. Open `http://localhost:5173` — browser redirects to Keycloak
2. Log in with homelab credentials → redirected back to moneybud
3. App renders (Dashboard visible)
4. DevTools → Network — confirm:
   - `POST /api/sync/register` → `201` with `device_key_id` + `device_secret`
   - `POST /api/sync/token` → `200` with `app_id: "moneybud"`
   - `POST /api/sync` (initial pull) → `200` with `ops: []`
   - `GET /api/sync/events` → `200`, type `eventsource` (open, no close)

- [ ] **Step 10.5: Sync verification**

1. Add a fixed expense in moneybud
2. DevTools → Network → last `POST /api/sync` → Preview → confirm `ops[0].field === "fixedExpenses"`
3. Open `http://localhost:5173` in a second browser window (incognito)
4. Log in → app loads → verify the expense appears (SSE push triggered pull on second client)

- [ ] **Step 10.6: Offline verification**

1. DevTools → Network → throttle to "Offline"
2. Add another expense
3. Check DevTools → Application → Local Storage → `moneybud-sync-queue` → confirm op is queued
4. Remove throttle → verify `POST /api/sync` fires immediately and queue clears

- [ ] **Step 10.7: Final commit**

```bash
git add .
git status  # confirm no untracked secrets
git commit -m "feat: complete Keycloak + mobile-db integration — auth gate, CRDT sync, SSE"
```

---

## Notes

**Security trade-off:** SSE passes `device_secret` as a URL query parameter (visible in server logs). Acceptable for homelab. Production hardening: implement a short-lived ticket endpoint (`POST /api/sync/ticket → { ticket_id }`) and use `GET /api/sync/events?ticket=...` instead.

**Token expiry during SSE:** If Keycloak token expires while SSE is open, the EventSource auto-reconnects — but the new connection sends a stale token. The 30s refresh interval in `AuthContext` should keep the token fresh. If expiry occurs before refresh, the SSE reconnect with old token will 401 and keep retrying silently. The user remains logged in (token refresh succeeds) but SSE stops working until page reload. Acceptable for homelab; fix by passing refreshed token to SyncEngine via a callback.

**CBOR BigInt:** `cbor-x` auto-promotes CBOR integers > `Number.MAX_SAFE_INTEGER` to `BigInt` on decode. Go's `fxamacker/cbor` decodes CBOR Tag 2/3 (bignum) as `int64`. The `hlcToCbor` helper in Express sends `w` as JS `BigInt`, which `cbor-x` encodes as Tag 2. This round-trips correctly.
