# Glassmorphism Redesign — Phase 2: Dashboard + Portfolio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Dashboard (health score → compact strip, chart full-width, glass cards) and Portfolio (glass tabs, glass table rows).

**Architecture:** Phase 1 must be complete first. All changes are CSS class replacements plus one layout restructure (health score widget). Zero logic changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Recharts, Lucide React

**Prerequisites:** Phase 1 complete. Run `npm run dev` to verify the app loads before starting.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/Dashboard.tsx` |
| Modify | `src/components/portfolio/Portfolio.tsx` |
| Modify | `src/components/portfolio/SecuritiesSection.tsx` |
| Modify | `src/components/portfolio/InvestmentReport.tsx` |

---

### Task 1: Dashboard — helper components + alert banners

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`

- [ ] **Replace `StatCard` function (lines ~36–63) with:**

```tsx
function StatCard({ title, value, sub, icon: Icon, trend, color = 'accent' }: {
  title: string; value: string; sub?: string; icon: React.ElementType
  trend?: number; color?: 'accent' | 'blue' | 'amber' | 'red'
}) {
  const variantMap = {
    accent: 'emerald' as const,
    blue:   'default' as const,
    amber:  'gold'    as const,
    red:    'danger'  as const,
  }
  const iconColorMap = {
    accent: 'text-accent bg-accent/10',
    blue:   'text-blue-400 bg-blue-500/10',
    amber:  'text-gold text-gold bg-gold/10',
    red:    'text-red-400 bg-red-500/10',
  }
  return (
    <Card variant={variantMap[color]} className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconColorMap[color]}`}><Icon size={20} /></div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-accent-light' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {formatPercent(trend)} performance + costo + tasse
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Replace `CustomTooltip` function with:**

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass !border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-semibold">{formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}
```

- [ ] **Replace `PrivacyChart` function with:**

```tsx
const PrivacyChart = ({ height = 200 }: { height?: number }) => (
  <div
    style={{ height }}
    className="flex items-center justify-center glass rounded-lg"
  >
    <p className="text-slate-500 text-sm">Modalità privacy attiva</p>
  </div>
)
```

- [ ] **Replace variable expense alert banner class (the blue one, ~line 156):**

Find:
```tsx
<div className="flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
```
Replace with:
```tsx
<div className="flex items-center justify-between px-4 py-3 glass-info rounded-xl">
```

- [ ] **Replace liquidity alert banner class (~line 169):**

Find:
```tsx
<div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
```
Replace with:
```tsx
<div className="flex items-center justify-between px-4 py-3 glass-gold rounded-xl">
```

- [ ] **Replace financial alerts loop banner class (~line 184):**

Find:
```tsx
<div key={i} className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
```
Replace with:
```tsx
<div key={i} className="flex items-start gap-3 px-4 py-3 glass-gold rounded-xl text-gold text-sm">
```

- [ ] **Verify:** `npm run dev` → stat cards show glass tints, alerts use glass style, tooltip glass panel

- [ ] **Commit:**
```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "style: Dashboard glass stat cards, alerts, tooltip"
```

---

### Task 2: Dashboard — health score compact strip + full-width chart

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`

- [ ] **Find the Charts row section (the `grid grid-cols-3 gap-6` div that contains the wealth chart + health score card, ~lines 200–294). Replace it entirely with:**

```tsx
{/* Compact health score strip */}
<div className="flex items-center gap-4 px-4 py-3 glass rounded-xl">
  {/* Mini ring */}
  <div className="relative w-10 h-10 flex-shrink-0">
    <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      {!privacyMode && (
        <circle cx="20" cy="20" r="15" fill="none"
          stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
          strokeWidth="4"
          strokeDasharray={`${(healthScore / 100) * 94.2} 94.2`}
          strokeLinecap="round"
        />
      )}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      {privacyMode
        ? <span className="text-[9px] font-bold text-slate-600">••</span>
        : <span className={`text-[10px] font-bold ${scoreColor}`}>{healthScore}</span>
      }
    </div>
  </div>

  {/* Label */}
  <div className="flex-1 min-w-0">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Salute Finanziaria</p>
    {!privacyMode
      ? <p className={`text-sm font-bold mt-0.5 ${scoreColor}`}>{scoreLabel} · {healthScore}/100</p>
      : <p className="text-sm text-slate-600 mt-0.5">Privacy attiva</p>
    }
  </div>

  {/* Wealth breakdown pills */}
  {wealthBreakdown.length > 0 && !privacyMode && (
    <div className="flex gap-4 flex-shrink-0">
      {wealthBreakdown.map((d, i) => (
        <div key={d.name} className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
          <span className="text-slate-400">{d.name}</span>
          <span className="text-slate-300 font-mono font-semibold">
            {totalWealth > 0 ? `${((d.value / totalWealth) * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )}
</div>

{/* Wealth chart — full width */}
<Card>
  <CardHeader
    title="Andamento Patrimonio"
    subtitle={`Ultimi ${RANGE_LABELS[wealthRange]} registrati`}
    action={
      <div className="flex gap-1">
        {([30, 60, 180, 365] as WealthRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setWealthRange(r)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all duration-200 cursor-pointer ${
              wealthRange === r
                ? 'bg-accent/15 text-accent-light border border-accent/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {r === 30 ? '30g' : r === 60 ? '2m' : r === 180 ? '6m' : '12m'}
          </button>
        ))}
      </div>
    }
  />
  <div className="px-5 pb-5">
    {privacyMode ? (
      <PrivacyChart height={200} />
    ) : historyData.length > 1 ? (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={historyData}>
          <defs>
            <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#wealthGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    ) : (
      <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
        I dati storici appariranno man mano che usi l'app
      </div>
    )}
  </div>
</Card>
```

- [ ] **Update Projections chart CartesianGrid stroke** (in the BarChart ~line 308):

Find: `stroke="#334155"`
Replace: `stroke="rgba(255,255,255,0.04)"`

- [ ] **Update Variable expenses chart CartesianGrid stroke** (~line 340):

Find: `stroke="#334155"`
Replace: `stroke="rgba(255,255,255,0.04)"`

- [ ] **Verify:**
  - Dashboard loads with health score as compact horizontal strip (not large card)
  - Wealth chart is full width
  - Range buttons use glass-pill active style
  - Charts have very subtle grid lines

- [ ] **Commit:**
```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "style: Dashboard health score compact strip, full-width chart"
```

---

### Task 3: Portfolio tabs

**Files:**
- Modify: `src/components/portfolio/Portfolio.tsx`

- [ ] **Replace the tab button className (~line 30) — find:**

```tsx
className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
  tab === key ? 'bg-accent text-white' : 'text-slate-400 hover:text-white hover:bg-surface-800'
}`}
```

**Replace with:**

```tsx
className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
  tab === key
    ? 'bg-accent/15 text-accent-light border border-accent/20'
    : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'
}`}
```

- [ ] **Verify:** Portfolio tab bar — active tab shows glass-emerald pill style, inactive tabs hover glass

- [ ] **Commit:**
```bash
git add src/components/portfolio/Portfolio.tsx
git commit -m "style: Portfolio tabs glass pill style"
```

---

### Task 4: SecuritiesSection table + banners

**Files:**
- Modify: `src/components/portfolio/SecuritiesSection.tsx`

- [ ] **Replace `PrivacyChart` component (top of file) with:**

```tsx
const PrivacyChart = ({ height = 180 }: { height?: number }) => (
  <div style={{ height }} className="flex items-center justify-center glass rounded-lg">
    <p className="text-slate-500 text-sm">Modalità privacy attiva</p>
  </div>
)
```

- [ ] **Replace TER info bar classes. Find:**

```tsx
<div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm">
```
Replace with:
```tsx
<div className="flex items-center gap-3 px-4 py-3 glass-info rounded-xl text-blue-300 text-sm">
```

- [ ] **Replace table header border. Find:**

```tsx
<tr className="border-b border-surface-700">
```
Replace with:
```tsx
<tr className="border-b border-white/[0.06]">
```

- [ ] **Replace table body divider. Find:**

```tsx
<tbody className="divide-y divide-surface-700">
```
Replace with:
```tsx
<tbody className="divide-y divide-white/[0.04]">
```

- [ ] **Replace table row hover. Find:**

```tsx
<tr key={sec.id} className="hover:bg-surface-700/50 transition-colors">
```
Replace with:
```tsx
<tr key={sec.id} className="hover:bg-white/[0.03] transition-colors">
```

- [ ] **Replace action button hover classes (all 4 in the row — RefreshCw, ExternalLink, Pencil, Trash2). Find all instances of:**

```tsx
hover:bg-surface-700
```
Replace all with:
```tsx
hover:bg-white/[0.06]
```

- [ ] **Update Recharts CartesianGrid stroke in the LineChart (history chart). Find:**

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
```
Replace with:
```tsx
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
```

- [ ] **Update Recharts Tooltip contentStyle in LineChart. Find:**

```tsx
contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
```
Replace with:
```tsx
contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', backdropFilter: 'blur(16px)' }}
```

- [ ] **Verify:** Portfolio → Titoli tab → securities table uses glass row dividers, action buttons hover glass, TER bar glass-info

- [ ] **Commit:**
```bash
git add src/components/portfolio/SecuritiesSection.tsx
git commit -m "style: SecuritiesSection glass table and banners"
```

---

### Task 5: InvestmentReport

**Files:**
- Modify: `src/components/portfolio/InvestmentReport.tsx`

- [ ] **Read `src/components/portfolio/InvestmentReport.tsx` to see current classes, then apply these replacements throughout the file:**

  - `bg-surface-800` → `glass` (on any Card-like container that doesn't already use the Card component)
  - `border-surface-700` → `border-white/[0.06]`
  - `divide-surface-700` → `divide-white/[0.04]`
  - `hover:bg-surface-700` → `hover:bg-white/[0.06]`
  - `bg-surface-700/50` → `bg-white/[0.03]`
  - Any `stroke="#334155"` in Recharts → `stroke="rgba(255,255,255,0.04)"`
  - Any `background: '#1e293b'` in Recharts contentStyle → `background: 'rgba(13,45,58,0.95)'`
  - Any `border: '1px solid #334155'` in contentStyle → `border: '1px solid rgba(255,255,255,0.08)'`

- [ ] **Verify:** Portfolio → Rendiconto tab loads correctly with glass styling

- [ ] **Commit:**
```bash
git add src/components/portfolio/InvestmentReport.tsx
git commit -m "style: InvestmentReport glass surface classes"
```

---

**Phase 2 complete.** Dashboard and Portfolio are fully restyled. Health score is compact, charts use glass tooltips and subtle grids, tables use glass dividers.
