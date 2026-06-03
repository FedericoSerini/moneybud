# Glassmorphism Redesign — Phase 3: Remaining Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply glass system to Expenses, Assets, Pension, FinancialAdvice, Settings, and ExcelImportModal.

**Architecture:** Phases 1 and 2 must be complete first. All changes are CSS class replacements — zero logic changes. Each file follows the same substitution pattern.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Recharts, Lucide React

**Prerequisites:** Phases 1 and 2 complete.

---

## Universal Substitution Reference

Apply these in every file unless otherwise noted:

| Find | Replace |
|------|---------|
| `bg-surface-800` (as container bg) | `glass` |
| `bg-surface-900` (as container bg) | `glass` |
| `bg-surface-700` (as container bg) | `bg-white/[0.06]` |
| `border-surface-700` | `border-white/[0.06]` |
| `border-surface-600` | `border-white/[0.08]` |
| `divide-surface-700` | `divide-white/[0.04]` |
| `hover:bg-surface-800` | `hover:bg-white/[0.06]` |
| `hover:bg-surface-700` | `hover:bg-white/[0.06]` |
| `bg-surface-700/50` | `bg-white/[0.03]` |
| `bg-surface-800/30` | `bg-white/[0.03]` |
| `stroke="#334155"` (Recharts) | `stroke="rgba(255,255,255,0.04)"` |
| `background: '#1e293b'` (Recharts contentStyle) | `background: 'rgba(13,45,58,0.95)'` |
| `border: '1px solid #334155'` (contentStyle) | `border: '1px solid rgba(255,255,255,0.08)'` |
| `bg-blue-500/10 border border-blue-500/30` | `glass-info` |
| `bg-amber-500/10 border border-amber-500/30` | `glass-gold` |
| `bg-amber-500/10 border border-amber-500/20` | `glass-gold` |
| `text-amber-400` (in alert context) | `text-gold` |

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/expenses/Expenses.tsx` |
| Modify | `src/components/expenses/ExcelImportModal.tsx` |
| Modify | `src/components/assets/Assets.tsx` |
| Modify | `src/components/pension/Pension.tsx` |
| Modify | `src/components/advice/FinancialAdvice.tsx` |
| Modify | `src/components/settings/Settings.tsx` |

---

### Task 1: Expenses

**Files:**
- Modify: `src/components/expenses/Expenses.tsx`

- [ ] **Apply Universal Substitutions** to the entire file.

- [ ] **Find the month-group header / accordion button** (the element showing month label + chevron). It likely uses `bg-surface-800` or similar as a container. Update it to use `glass` styling.

- [ ] **Find the fixed expense rows table** (the `<tbody>` with drag handles and rows). Replace row hover from `hover:bg-surface-700/50` or similar to `hover:bg-white/[0.03]`.

- [ ] **Find the variable expenses grouped list rows.** Apply the same hover replacement.

- [ ] **Find summary cards** (fixed total / variable total / balance cards at the top). Ensure they use `Card` component with appropriate variant:
  - Fixed expenses total → `Card` (default, no variant prop needed — glass applies via component)  
  - Variable expenses total → `Card variant="gold"`  
  - Monthly balance (positive) → `Card variant="emerald"`, (negative) → `Card variant="danger"`
  
  The current code uses `Card className="p-4"` — update to add `variant` prop where appropriate. Locate the summary stats section and update:

  ```tsx
  {/* Fixed total */}
  <Card className="p-4">  {/* keep as-is — default glass */}

  {/* Variable total */}
  <Card variant="gold" className="p-4">

  {/* Balance */}
  <Card variant={monthlyBalance >= 0 ? 'emerald' : 'danger'} className="p-4">
  ```

  Note: the exact variable name for monthly balance may differ — use whatever the file uses for the calculated net balance.

- [ ] **Update Recharts charts** (BarChart, PieChart) using the Universal Substitutions for CartesianGrid stroke and Tooltip contentStyle.

- [ ] **Find the ExcelImportModal trigger button** and the import banner if any — apply glass-info if present.

- [ ] **Verify:** `npm run dev` → Expenses page: month group headers glass, rows glass hover, summary cards tinted, charts updated

- [ ] **Commit:**
```bash
git add src/components/expenses/Expenses.tsx
git commit -m "style: Expenses glass rows, cards, charts"
```

---

### Task 2: ExcelImportModal

**Files:**
- Modify: `src/components/expenses/ExcelImportModal.tsx`

- [ ] **Apply Universal Substitutions** throughout the file.

- [ ] **Find any drag-and-drop zone** (the file drop area). It likely has a dashed border and surface background. Update to:

```tsx
className="... glass border-2 border-dashed border-white/[0.15] hover:border-accent/40 ..."
```

- [ ] **Find the duplicate detection warning rows** (the rows that highlight already-imported entries). They likely use `bg-amber-500/10` or `bg-yellow-500/10`. Replace with `glass-gold`.

- [ ] **Find the success/error state banners** inside the modal. Update:
  - Success banner: `glass-emerald`
  - Error/warning banner: `glass-gold` or `glass-danger`

- [ ] **Verify:** Open Excel import modal → drop zone glass, duplicate rows gold-tinted, modal itself uses glass (from Modal component changes in Phase 1)

- [ ] **Commit:**
```bash
git add src/components/expenses/ExcelImportModal.tsx
git commit -m "style: ExcelImportModal glass drop zone and state banners"
```

---

### Task 3: Assets

**Files:**
- Modify: `src/components/assets/Assets.tsx`

- [ ] **Read `src/components/assets/Assets.tsx`** to understand its structure, then apply Universal Substitutions throughout.

- [ ] **Find asset category cards** (Liquidità, Immobili, Veicoli, Altro). Update their Card variants:
  - Liquidità (cash/liquidity) → `Card variant="emerald"`
  - Veicoli (vehicles) → `Card variant="gold"`
  - Immobili (real estate) → `Card` (default)
  - Altro (other) → `Card` (default)
  
  If they don't use the `Card` component directly, wrap their containers with it or add appropriate class: `glass-emerald`, `glass-gold`, `glass`.

- [ ] **Find the emergency fund indicator row/section.** It shows coverage months. Update its container:
  - ≥ 6 months → `glass-emerald`
  - 3–6 months → `glass-gold`
  - < 3 months → `glass-danger`
  
  The current code likely uses conditional `bg-` classes. Replace with the glass variant equivalents.

- [ ] **Find asset table rows** (add/edit asset list). Apply Universal Substitutions for dividers and hover states.

- [ ] **Verify:** Assets page → category cards tinted, emergency fund strip colored correctly, rows glass hover

- [ ] **Commit:**
```bash
git add src/components/assets/Assets.tsx
git commit -m "style: Assets glass category cards and emergency fund indicator"
```

---

### Task 4: Pension

**Files:**
- Modify: `src/components/pension/Pension.tsx`

- [ ] **Read `src/components/pension/Pension.tsx`**, apply Universal Substitutions throughout.

- [ ] **Find the projection milestones section** (10/20/30 year grid). The final milestone (longest horizon) should use `Card variant="emerald"` to highlight the goal. Others use default `Card`.

- [ ] **Update Recharts charts** (area/line chart for projections) using Universal Substitutions for CartesianGrid stroke and contentStyle.

- [ ] **Find pension fund rows** (individual fund entries if list-based). Apply hover and divider substitutions.

- [ ] **Verify:** Pension page loads, projection milestones tinted, charts use subtle grids

- [ ] **Commit:**
```bash
git add src/components/pension/Pension.tsx
git commit -m "style: Pension glass cards and charts"
```

---

### Task 5: FinancialAdvice

**Files:**
- Modify: `src/components/advice/FinancialAdvice.tsx`

- [ ] **Read `src/components/advice/FinancialAdvice.tsx`** to understand the advice card structure.

- [ ] **Apply Universal Substitutions** throughout.

- [ ] **Find advice card containers.** The current code likely renders cards with surface backgrounds and colored left borders or icon backgrounds. Replace card containers with glass variants based on severity:

  Each advice item should be wrapped in a container with:
  - Positive advice (buono, ottimo, surplus, risparmio alto) → `glass-emerald`
  - Warning advice (attenzione, spese elevate, bassa liquidità) → `glass-gold`
  - Danger advice (negativo, deficit) → `glass-danger`
  - Info/projection advice (proiezione, diversificazione) → `glass-info`

  The severity is likely determined by a property on the advice object or by a conditional in the existing render. Preserve the existing logic — just change the container className from surface-based to glass-based.

  Example pattern to apply:
  ```tsx
  // Before
  <div className="flex ... bg-green-500/10 border border-green-500/20 rounded-xl ...">
  // After
  <div className="flex ... glass-emerald rounded-xl ...">

  // Before
  <div className="flex ... bg-amber-500/10 border border-amber-500/30 rounded-xl ...">
  // After
  <div className="flex ... glass-gold rounded-xl ...">
  ```

- [ ] **Find the AI advice icon/avatar** (the small circle with an icon). Update its background from surface to:
  - `bg-gradient-to-br from-accent to-accent-dark` for the main AI indicator

- [ ] **Verify:** Consigli page → advice cards color-coded with glass tints, no opaque surface backgrounds

- [ ] **Commit:**
```bash
git add src/components/advice/FinancialAdvice.tsx
git commit -m "style: FinancialAdvice glass tinted advice cards"
```

---

### Task 6: Settings

**Files:**
- Modify: `src/components/settings/Settings.tsx`

- [ ] **Apply Universal Substitutions** throughout.

- [ ] **Find the section groupings** (Profilo finanziario, Preferenze, Privacy, Alert, etc.). Each section uses a `Card` or a surface-bg div. Ensure each section uses `Card` (default glass). No variant overrides needed except the danger zone.

- [ ] **Find the danger zone section** (Reset dati, the destructive action area). Replace its container:

  Find (approximate):
  ```tsx
  <Card className="...">
    {/* Reset / danger content */}
  ```
  Replace with:
  ```tsx
  <Card variant="danger" className="...">
  ```

- [ ] **Find the privacy toggle switch** (Eye/EyeOff or a manual toggle). It currently uses surface classes. Update the toggle track:

  ```tsx
  {/* Toggle track — ON state */}
  className="... bg-accent/20 border border-accent/30 ..."
  {/* Toggle track — OFF state */}
  className="... glass ..."
  ```

- [ ] **Find the "Salvato!" success feedback.** It likely appears as a small banner or badge. Ensure it uses `glass-emerald`:

  ```tsx
  {saved && (
    <span className="text-xs font-semibold text-accent-light glass-emerald px-2 py-1 rounded-lg">
      Salvato ✓
    </span>
  )}
  ```

- [ ] **Find the API key input section** (for financial advice AI key, if present). Ensure Input component is used — it already gets glass styling from Phase 1.

- [ ] **Verify:** Settings page → all sections glass panels, danger zone red-tinted, saved feedback emerald

- [ ] **Commit:**
```bash
git add src/components/settings/Settings.tsx
git commit -m "style: Settings glass sections and danger zone"
```

---

### Task 7: Final polish pass

**Files:**
- All modified files (review pass)

- [ ] **Run `npm run dev` and navigate every page** — Dashboard, Portfolio (all tabs), Spese, Asset, Pensione, Consigli, Impostazioni, Welcome (`/welcome`)

- [ ] **Check list while reviewing each page:**
  - [ ] No visible `bg-surface-*` classes remaining (should all be glass or transparent)
  - [ ] No opaque white or grey card backgrounds
  - [ ] Background gradient + radial glows visible behind all panels
  - [ ] Charts: grid lines are very subtle (rgba 4%), area fill has gradient
  - [ ] Modals: glass panel with blurred backdrop
  - [ ] Sidebar: icon-only, tooltips appear on hover, active item highlighted
  - [ ] Header: 56px tall, monthly balance pill visible, alerts bell gold
  - [ ] Privacy mode: toggling hides all values, glass-privacy overlay on charts

- [ ] **Fix any remaining surface-class stragglers** in whichever file they appear.

- [ ] **Final commit:**
```bash
git add -A
git commit -m "style: glassmorphism redesign — final polish pass"
```

---

**Phase 3 complete. Full glassmorphism redesign done.**

All 7 pages + Welcome screen use the glass system. Zero features removed. All calculations, modals, imports, alerts, privacy mode, and data flows preserved.
