# moneybud — Keycloak + mobile-db Integration

**Date:** 2026-06-03
**Status:** Approved, pending implementation

## Overview

Wire Keycloak OIDC authentication and mobile-db CRDT sync into moneybud. Replace localStorage as the source of truth with mobile-db. Offline-first: mutations queue locally and flush when online.

## Requirements

- Hard auth gate: no app access without a valid Keycloak session
- Start fresh: discard any existing localStorage state; mobile-db is authoritative
- Offline-first: mutations queue in localStorage when offline, flush on reconnect
- Multi-device: CRDT ops enable concurrent edits from different devices to merge correctly

---

## Section 1 — Auth (Keycloak PKCE)

### Keycloak Client Setup (manual, one-time)

| Setting | Value |
|---|---|
| Realm | `master` |
| Client ID | `moneybud` |
| Client authentication | OFF (public client) |
| Authorization | OFF |
| Standard flow | ON |
| PKCE method | S256 |
| Redirect URIs | `http://localhost:5173/*`, `https://moneybud.federicoserini.com/*` |
| Web origins | same as redirect URIs |

### Runtime Auth Flow

`main.tsx` calls `keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256' })` before mounting React. Keycloak handles the redirect to the login page automatically — no custom login page needed.

Token refreshed with `keycloak.updateToken(60)` before any sync call.

### AuthContext API

```ts
const { token, userId, isReady, logout } = useAuth()
// token  = Keycloak JWT (non-null inside hard gate)
// userId = sub claim (non-null inside hard gate)
// isReady = false until keycloak.init() resolves
```

---

## Section 2 — Express Proxy Routes

### New Dependencies (server)

```bash
npm install cbor-x @mongodb-js/zstd
```

### Environment

`MOBILE_DB_URL` in `.env`:
- Local: `http://localhost:8443`
- Prod: `https://mobile-db.federicoserini.com`

### Routes

| Route | Proxies to | Purpose |
|---|---|---|
| `POST /api/sync/register` | `POST {MOBILE_DB_URL}/devices/register` | First-time device registration |
| `POST /api/sync/token` | `POST {MOBILE_DB_URL}/auth/token` | Exchange device key + Keycloak JWT → `{app_id, user_id}` |
| `POST /api/sync` | `POST {MOBILE_DB_URL}/sync` | JSON SyncMessage → CBOR+zstd → mobile-db → JSON SyncResponse |
| `GET /api/sync/events` | `GET {MOBILE_DB_URL}/events` | SSE proxy (stream piped through) |

### Encoding pipeline (`POST /api/sync`)

```
browser JSON → Express: encode(cbor) → compress(zstd) → mobile-db
mobile-db → Express: decompress(zstd) → decode(cbor) → browser JSON
```

Express forwards the Keycloak `Authorization: Bearer <token>` header from the browser to mobile-db on `/api/sync/token` and `/api/sync/events`.

---

## Section 3 — Sync Data Model

### Mapping AppState → CRDTOp

| mobile-db field | value |
|---|---|
| `doc_id` | Keycloak `sub` (user ID) |
| `dataset_id` | `"moneybud"` |
| `field` | top-level AppState key (`"securities"`, `"fixedExpenses"`, etc.) |
| `value` | full array/object for that key |

### Merge Strategy

Last-write-wins per top-level field, decided by HLC timestamp. Concurrent edits to *different* fields both survive. Concurrent edits to the *same* field: higher HLC wins. Acceptable for a single-user multi-device personal finance app.

### HLC Implementation

```ts
interface HLC { w: bigint; l: number; d: string }

function tickHLC(current: HLC, deviceId: string): HLC {
  const now = BigInt(Date.now()) * 1_000_000n // nanoseconds
  const w = now > current.w ? now : current.w
  const l = w === current.w ? current.l + 1 : 0
  return { w, l, d: deviceId }
}
```

### Op Generation (per mutation)

Each AppContext mutation generates one `CRDTOp`:

```ts
{
  op_id:     uuid(),
  doc_id:    userId,
  field:     "securities",       // whichever field changed
  value:     newSecuritiesArray, // full new value
  ts:        tickHLC(clock, deviceId),
  device_id: deviceId,
}
```

### Pull / Merge

On receiving delta ops from server: apply `op.value` to local state for `op.field` if `op.ts > lastSeenTs[op.field]`. Server guarantees causal order.

---

## Section 4 — SyncEngine + AppContext Refactor

### SyncEngine (`src/lib/sync.ts`)

Instantiated once inside `AppProvider`. Holds a ref to `setState`.

**localStorage keys managed by SyncEngine:**

| Key | Content |
|---|---|
| `moneybud-device-creds` | `{ device_key_id, device_secret, device_id }` |
| `moneybud-sync-queue` | `CRDTOp[]` — pending ops not yet flushed |
| `moneybud-sync-clock` | `HLC` — last known server clock |

**Methods:**

```ts
class SyncEngine {
  init(token: string, userId: string, setState, mergeRemoteOps): Promise<void>
  push(op: CRDTOp): void       // enqueue op, flush if online
  flush(): Promise<void>        // POST queue to /api/sync, clear on success
  pull(): Promise<void>         // POST /api/sync with empty ops, merge response
  destroy(): void               // close SSE connection
}
```

**`init()` sequence:**
1. Register device if `moneybud-device-creds` absent → `POST /api/sync/register`
2. Exchange token → `POST /api/sync/token` (cache result for Keycloak token lifetime)
3. Pull snapshot (delta since HLC zero) → `setState(snapshot)`
4. Flush any queued ops from previous offline session
5. Subscribe SSE → on event: `pull()` → `mergeRemoteOps(ops)`

### AppContext Changes

| What | Change |
|---|---|
| `loadState()` | Removed. State initialized from mobile-db snapshot in `SyncEngine.init()`. |
| localStorage save `useEffect` | Removed as primary persistence. |
| Every mutation | Calls `engine.push(op)` after `setState`. |
| New `mergeRemoteOps(ops)` | Applies remote ops to state via `setState`; called by SyncEngine on SSE delta. |
| SyncEngine lifecycle | `useEffect` in AppProvider: create engine on auth ready, call `engine.destroy()` on cleanup. |

### Offline Behavior

- `navigator.onLine` checked before flush; if offline, op stays queued
- `window.addEventListener('online', engine.flush)` — flushes on reconnect
- App state remains fully usable offline (local mutations apply immediately)

---

## Section 5 — File Map

### New Files

```
src/lib/keycloak.ts          — Keycloak singleton (keycloak-js instance + config)
src/lib/sync.ts              — SyncEngine class, HLC, CRDTOp types
src/context/AuthContext.tsx  — AuthProvider + useAuth hook
```

### Modified Files

```
src/main.tsx                 — await keycloak.init() before ReactDOM.createRoot
src/App.tsx                  — wrap with <AuthProvider>; render null until isReady
src/context/AppContext.tsx   — remove localStorage load/save; add SyncEngine init + mergeRemoteOps
server/index.js              — 4 new proxy routes; import cbor-x and @mongodb-js/zstd
package.json (root)          — add keycloak-js
package.json (server deps)   — add cbor-x, @mongodb-js/zstd
.env / .env.example          — add MOBILE_DB_URL
```

### No Changes

- All route components (`Dashboard`, `Expenses`, etc.) — unchanged
- All AppContext mutation methods — signatures unchanged; callers unaffected
- `server/index.js` Yahoo Finance and Claude routes — unchanged

---

## Out of Scope

- Role-based access (Keycloak Authorization Services)
- Per-item CRDT granularity (array element-level merge)
- Migration of existing localStorage data
- Admin-level mobile-db access from moneybud
