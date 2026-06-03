# Moneybud — Glassmorphism Redesign

**Date:** 2026-05-27  
**Status:** Approved  
**Approach:** Token-first Tailwind overhaul (Approach A)

---

## 1. Summary

Full visual redesign of Moneybud using glassmorphism. All 7 existing pages + new Welcome screen. Zero features removed — only CSS and layout changes. All business logic, calculations, and data structures untouched.

---

## 2. Design System

### 2.1 Color Tokens (replaces current `tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `surface.950` | `#040d12` | Body background |
| `surface.900` | `#061a20` | Base layer |
| `surface.800` | `#0d2d3a` | Elevated surface |
| `surface.700` | `#1a3a42` | Border/divider |
| `emerald.DEFAULT` | `#10b981` | Primary accent, gains, savings, positive |
| `emerald.light` | `#34d399` | Text on emerald bg |
| `emerald.dark` | `#059669` | Gradient end, hover |
| `gold.DEFAULT` | `#f59e0b` | Secondary accent, warnings, monthly balance |
| `gold.light` | `#fbbf24` | Text on gold bg |
| `gold.dark` | `#d97706` | Gradient end |
| `danger` | `#ef4444` | Negative values, danger zone |
| `info` | `#3b82f6` | Info cards, advice |

### 2.2 Glass Utility Classes (added to `index.css`)

```css
/* Base glass card */
.glass {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Emerald-tinted — positive metrics, gains */
.glass-emerald {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.18);
}

/* Gold-tinted — warnings, monthly balance, trust signals */
.glass-gold {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.18);
}

/* Red-tinted — negative values, danger zone */
.glass-danger {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
}

/* Blue-tinted — info, advice cards */
.glass-info {
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.15);
}
```

### 2.3 Background

Global body background: animated radial gradient canvas.

```css
body {
  background: linear-gradient(145deg, #040d12 0%, #061a20 50%, #0a1a10 100%);
}
/* Two fixed radial glows via pseudo-elements or divs */
/* Top-right: emerald glow — rgba(16,185,129, 0.18) */
/* Bottom-left: gold glow — rgba(245,158,11, 0.12) */
```

### 2.4 Typography

Inter + JetBrains Mono — **unchanged**. Scale:

| Role | Size | Weight |
|---|---|---|
| Display (large values) | 2.25rem | 800 |
| Heading | 1.25rem | 700 |
| Label (uppercase) | 0.68rem | 600, tracking-wider |
| Body | 0.82rem | 400 |
| Mono (currency) | inherits | 700, JetBrains Mono |

### 2.5 Buttons

| Variant | Style |
|---|---|
| `primary` | `bg-gradient(emerald → emerald-dark)`, white text, emerald shadow |
| `gold` | `bg-gradient(gold → gold-dark)`, white text, gold shadow |
| `ghost` | transparent, emerald border, emerald text |
| `secondary` | glass, slate text |
| `danger` | red-600, white text |

### 2.6 Spacing & Radius

- **Spacing:** 4pt base scale (4, 8, 12, 16, 24, 32, 48px)
- **Radius:** sm=6, md=10, lg=14, xl=18, 2xl=24, full=9999

---

## 3. New: Welcome Screen

**Route:** `/welcome`  
**File:** `src/components/welcome/Welcome.tsx`  
**Trigger:** `App.tsx` always renders `/welcome` as the default route. "Inizia →" navigates to `/` (Dashboard). The app never auto-redirects away from the welcome screen — it is always the entry point on fresh page load. Users who return with existing data still see it briefly; no session state needed.

**Layout:**
- Full-screen glassmorphism canvas (same gradient bg + glows)
- Three decorative floating glass cards (tilted, semi-transparent) showing: Portfolio value, Bilancio, Salute score
- Center: logo mark (emerald gradient square with wallet icon) → "Moneybud" title → tagline → "Inizia →" CTA button
- Bottom: privacy note ("Nessun dato inviato a server esterni. Tutti i dati sono salvati localmente nel tuo browser.")

**Behavior:** On click "Inizia →", navigate to `/` (Dashboard). No data is cleared. Decorative cards show real data if it exists, placeholder dashes if not.

---

## 4. Layout Changes

### 4.1 Sidebar (`src/components/layout/Sidebar.tsx`)

**Before:** `w-64`, icon + label per nav item  
**After:** `w-14` (56px), icon only, tooltip on hover showing label

- Glass panel: `backdrop-blur-xl`, `bg-surface-950/65`, `border-r border-emerald/10`
- Logo: 22×22px emerald gradient rounded square
- Nav icons: 26×26px rounded-lg, active state = `bg-emerald/15` with emerald dot indicator
- Tooltip: absolute positioned label appearing on hover (right side)
- Bottom: settings icon pinned at bottom

### 4.2 Header (`src/components/layout/Header.tsx`)

- Height: 36px (reduced from 64px)
- Glass: `backdrop-blur-xl bg-surface-950/50 border-b border-white/5`
- Left: page title (bold, white)
- Right: alerts bell + privacy toggle + monthly balance pill
- Monthly balance shown as a glass pill (`glass-gold` if positive, `glass-danger` if negative)

### 4.3 Layout (`src/components/layout/Layout.tsx`)

- Body bg: gradient canvas with two fixed radial glows (decorative divs)
- Sidebar: `ml-14` instead of `ml-64`
- Main padding: `p-6`

---

## 5. UI Components

### 5.1 Card (`src/components/ui/Card.tsx`)

New variants prop: `'default' | 'emerald' | 'gold' | 'danger' | 'info'`  
All use `rounded-xl glass` base + variant border/bg.

### 5.2 Button (`src/components/ui/Button.tsx`)

Add `gold` variant. Update `primary` to use gradient + shadow. Update `secondary` to use glass style.

### 5.3 Input (`src/components/ui/Input.tsx`)

Glass input: `bg-white/4 border border-white/8 focus:border-emerald/40 focus:ring-emerald/20`

### 5.4 Modal (`src/components/ui/Modal.tsx`)

Glass modal: `backdrop-blur-2xl bg-surface-950/80 border border-white/10 rounded-2xl shadow-2xl`  
Backdrop: `bg-black/60 backdrop-blur-sm`

### 5.5 Badge (`src/components/ui/Badge.tsx`)

Pill style with glass tint per color variant.

---

## 6. Dashboard (`src/components/dashboard/Dashboard.tsx`)

All existing logic preserved. Layout changes only:

- **Stat cards (4-col grid):** glass variants — neutral, emerald (portfolio), gold (bilancio), neutral (risparmio)
- **Financial health widget:** compact horizontal strip (small ring + score + breakdown dots). NOT a large standalone card.
- **Wealth chart:** full-width, area line chart (already uses Recharts `AreaChart`) — keep as-is, restyle `CartesianGrid` stroke to `rgba(255,255,255,0.04)`, area fill to emerald gradient
- **Projections chart:** keep `BarChart`, restyle bars to `fill="#10b981"` with glass card wrapper
- **Variable expenses chart:** keep `BarChart`, blue bars (`fill="#3b82f6"`)
- **Alert banners:** glass-tinted (blue/gold) instead of opaque colored bg
- **Tooltip:** glass styled (`bg-surface-800/90 backdrop-blur border-white/10`)

---

## 7. Portfolio (`src/components/portfolio/`)

- Tabs (Azioni, ETF, PAC, Bond, Crypto, Materie Prime): glass pill tabs, active = `bg-emerald/15 text-emerald-light border-emerald/20`
- Summary row (3 stats): glass cards — neutral (investito), emerald (guadagno netto), neutral (rendimento%)
- Securities table rows: glass row `bg-white/2 border-white/4 hover:bg-white/5`, gain % colored emerald/red
- `AddSecurityModal`: full glass modal treatment
- `InvestmentReport`: glass card sections

---

## 8. Spese (`src/components/expenses/Expenses.tsx`)

- Month/year selector: glass pill tabs
- Summary (fisse/variabili/saldo): 3-col glass card grid — neutral, gold, emerald
- Expense table rows: glass rows, amounts right-aligned mono font, variable = gold tint, fixed = neutral
- `ExcelImportModal`: full glass modal treatment
- Duplicate detection UI: unchanged logic, glass alert banner

---

## 9. Asset (`src/components/assets/Assets.tsx`)

- Category cards (Liquidità, Immobili, Veicoli, Altro): glass cards with color tints + mini progress bar showing % of total
- Emergency fund indicator: emerald glass strip at bottom showing months coverage
- Add/edit asset: glass modal or inline glass form

---

## 10. Pensione (`src/components/pension/Pension.tsx`)

- Value + monthly contribution: 2-col glass card grid
- Projection mini line chart: Recharts area line, emerald
- Milestone grid (10/20/30 year): 3-col glass cards, last one emerald-tinted

---

## 11. Consigli AI (`src/components/advice/FinancialAdvice.tsx`)

- Each advice card: glass tinted by severity
  - Positive → `glass-emerald` + emerald sparkle icon
  - Warning → `glass-gold` + gold alert icon
  - Info/projection → `glass-info` + blue chart icon
- Existing advice generation logic: **untouched**

---

## 12. Impostazioni (`src/components/settings/Settings.tsx`)

- Section grouping: glass cards per section (Profilo, Preferenze, Privacy, Danger Zone)
- Toggle switches: styled with emerald active state
- Danger zone section: `glass-danger` tint
- All existing fields (reddito, rendimento atteso, alert thresholds): preserved

---

## 13. Implementation Order

1. `tailwind.config.js` + `index.css` — token overhaul + glass utilities + bg
2. UI primitives: `Card`, `Button`, `Input`, `Modal`, `Badge`
3. Layout: `Layout`, `Sidebar`, `Header`
4. `Welcome.tsx` — new file
5. `App.tsx` — add welcome route
6. `Dashboard.tsx` — layout + glass restyle
7. `Portfolio` files — tabs + table + modals
8. `Expenses.tsx` + `ExcelImportModal.tsx`
9. `Assets.tsx`
10. `Pension.tsx`
11. `FinancialAdvice.tsx`
12. `Settings.tsx`

---

## 14. Constraints

- **No feature removal.** Every calculation, alert, privacy mode, modal, import flow stays.
- **No new dependencies.** Recharts already installed. No extra CSS libs.
- **Tailwind only.** No inline style blocks in components except for dynamic values (chart colors, gradient ids).
- **Accessibility:** focus rings visible, contrast ≥4.5:1 on all text, `cursor-pointer` on all interactive elements.
- **Transitions:** `transition-all duration-200` on interactive elements. `prefers-reduced-motion` respected via Tailwind's `motion-reduce:` variant.
