# Glassmorphism Redesign — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace color tokens, add glass utilities, restyle all shared UI primitives, rebuild Layout/Sidebar/Header, and add the Welcome screen.

**Architecture:** Token-first Tailwind overhaul. New `surface`/`gold` tokens + `glass*` CSS component classes in `index.css`. Every component inherits automatically. Welcome screen is a standalone route outside Layout.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, React Router v6, Lucide React

---

## File Map

| Action | File |
|--------|------|
| Modify | `tailwind.config.js` |
| Modify | `src/index.css` |
| Modify | `src/components/ui/Card.tsx` |
| Modify | `src/components/ui/Badge.tsx` |
| Modify | `src/components/ui/Button.tsx` |
| Modify | `src/components/ui/Input.tsx` |
| Modify | `src/components/ui/Modal.tsx` |
| Modify | `src/components/layout/Sidebar.tsx` |
| Modify | `src/components/layout/Layout.tsx` |
| Modify | `src/components/layout/Header.tsx` |
| Create | `src/components/welcome/Welcome.tsx` |
| Modify | `src/App.tsx` |

---

### Task 1: Design tokens + glass utilities

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Replace `tailwind.config.js` entirely:**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#040d12',
          900: '#061a20',
          800: '#0d2d3a',
          700: '#1a3a42',
          600: '#2a4a52',
        },
        accent: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        gold: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Replace `src/index.css` entirely:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply text-slate-100 font-sans;
    background: linear-gradient(145deg, #040d12 0%, #061a20 50%, #0a1a10 100%);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #040d12; }
  ::-webkit-scrollbar-thumb { background: #1a3a42; border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: #2a4a52; }
}

@layer utilities {
  .font-mono { font-family: 'JetBrains Mono', monospace; }
}

@layer components {
  .glass {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    @apply bg-white/[0.04] border border-white/[0.08];
  }
  .glass-emerald {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    @apply bg-accent/[0.06] border border-accent/[0.18];
  }
  .glass-gold {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    @apply bg-gold/[0.05] border border-gold/[0.18];
  }
  .glass-danger {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    @apply bg-red-500/[0.05] border border-red-500/[0.15];
  }
  .glass-info {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    @apply bg-blue-500/[0.05] border border-blue-500/[0.15];
  }
}
```

- [ ] **Verify:** `npm run dev` → app loads, dark teal background visible, no console errors

- [ ] **Commit:**
```bash
git add tailwind.config.js src/index.css
git commit -m "style: glass token system and css utilities"
```

---

### Task 2: Card + Badge

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Badge.tsx`

- [ ] **Replace `src/components/ui/Card.tsx`:**

```tsx
import { ReactNode } from 'react'

export type CardVariant = 'default' | 'emerald' | 'gold' | 'danger' | 'info'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default:  'glass',
  emerald:  'glass-emerald',
  gold:     'glass-gold',
  danger:   'glass-danger',
  info:     'glass-info',
}

export function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  return (
    <div
      className={`${variantClasses[variant]} rounded-xl ${
        onClick ? 'cursor-pointer hover:border-accent/40 transition-all duration-200' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between px-5 pt-5 pb-3">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

- [ ] **Replace `src/components/ui/Badge.tsx`:**

```tsx
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
  size?: 'sm' | 'md'
}

const variants = {
  green:  'bg-accent/15 text-accent-light border border-accent/25',
  red:    'bg-red-500/15 text-red-400 border border-red-500/25',
  yellow: 'bg-gold/15 text-gold-light border border-gold/25',
  blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  gray:   'bg-white/[0.06] text-slate-400 border border-white/[0.08]',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full backdrop-blur-sm ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Verify:** `npm run dev` → existing cards should now appear as glass panels

- [ ] **Commit:**
```bash
git add src/components/ui/Card.tsx src/components/ui/Badge.tsx
git commit -m "style: glass Card and Badge components"
```

---

### Task 3: Button + Input + Modal

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Modal.tsx`

- [ ] **Replace `src/components/ui/Button.tsx`:**

```tsx
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

const variants = {
  primary:   'bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent-dark text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]',
  secondary: 'glass text-slate-300 hover:bg-white/[0.08] hover:text-white',
  gold:      'bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold-dark text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)]',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({ variant = 'primary', size = 'md', children, loading, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
```

- [ ] **Replace `src/components/ui/Input.tsx`:**

```tsx
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
  suffix?: string
}

export function Input({ label, error, prefix, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center">
        {prefix && (
          <span className="px-3 py-2 text-sm text-slate-400 glass border-r-0 rounded-l-lg">
            {prefix}
          </span>
        )}
        <input
          className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 placeholder:text-slate-600 ${
            prefix ? 'rounded-r-lg' : suffix ? 'rounded-l-lg' : 'rounded-lg'
          } ${error ? '!border-red-500/60' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="px-3 py-2 text-sm text-slate-400 glass border-l-0 rounded-r-lg">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 rounded-lg ${
          error ? '!border-red-500/60' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 rounded-lg resize-none ${
          error ? '!border-red-500/60' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
```

- [ ] **Replace `src/components/ui/Modal.tsx`:**

```tsx
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} glass !border-white/10 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Verify:** Open a modal in the app (e.g. add a security in Portfolio) → glass appearance, blurred backdrop

- [ ] **Commit:**
```bash
git add src/components/ui/Button.tsx src/components/ui/Input.tsx src/components/ui/Modal.tsx
git commit -m "style: glass Button, Input, Modal components"
```

---

### Task 4: Sidebar + Layout

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Layout.tsx`

- [ ] **Replace `src/components/layout/Sidebar.tsx`:**

```tsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Receipt, Home,
  PiggyBank, Lightbulb, Settings, Wallet,
} from 'lucide-react'

const navItems = [
  { to: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio',   icon: TrendingUp },
  { to: '/spese',     label: 'Spese',       icon: Receipt },
  { to: '/asset',     label: 'Asset',       icon: Home },
  { to: '/pensione',  label: 'Pensione',    icon: PiggyBank },
  { to: '/consigli',  label: 'Consigli AI', icon: Lightbulb },
]

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        `group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-accent/15 text-accent-light'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]'
        }`
      }
    >
      <Icon size={18} />
      <span className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium bg-surface-800 border border-white/[0.08] text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150 shadow-xl">
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="w-14 h-screen glass !rounded-none border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
          <Wallet size={15} className="text-white" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {navItems.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={to === '/'} />
        ))}
      </nav>

      {/* Settings pinned bottom */}
      <div className="flex items-center justify-center py-3 border-t border-white/[0.06]">
        <NavItem to="/impostazioni" label="Impostazioni" icon={Settings} />
      </div>
    </aside>
  )
}
```

- [ ] **Replace `src/components/layout/Layout.tsx`:**

```tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex relative">
      {/* Radial glow orbs — decorative, fixed behind all content */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)' }}
      />
      <div
        className="fixed bottom-0 left-14 w-[400px] h-[400px] rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)' }}
      />

      <Sidebar />
      <div className="flex-1 ml-14 flex flex-col min-h-screen relative z-10">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Verify:** Sidebar is now 56px wide, icon-only, logo visible. Hover over a nav item → tooltip appears on right. Background glows visible.

- [ ] **Commit:**
```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Layout.tsx
git commit -m "style: icon-only glass Sidebar, Layout with glow orbs"
```

---

### Task 5: Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Replace `src/components/layout/Header.tsx`:**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Eye, EyeOff, X, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getTotalAssetValue, getMonthlyBalance, getSavingsRate,
  getFinancialAlerts, getTotalMonthlyFixed, getTotalPensionValue,
  getPotentialMonthlyIncome, getEmergencyFundMonthlyBase, getEmergencyFundCoverageMonths,
} from '../../utils/calculations'
import { usePrivacy } from '../../hooks/usePrivacy'

const routeTitles: Record<string, string> = {
  '/':              'Dashboard',
  '/portfolio':     'Portfolio Titoli',
  '/spese':         'Tracker Spese',
  '/asset':         'Asset Personali',
  '/pensione':      'Fondo Pensione',
  '/consigli':      'Consigli Finanziari',
  '/impostazioni':  'Impostazioni',
}

export function Header() {
  const location = useLocation()
  const { state } = useApp()
  const { privacyMode, fmt, toggle } = usePrivacy()
  const title = routeTitles[location.pathname] ?? 'Moneybud'
  const [alertsOpen, setAlertsOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const effectiveMonthlyIncome = getPotentialMonthlyIncome(state.settings)
  const monthlyBalance = getMonthlyBalance(state.settings, state.fixedExpenses, state.variableExpenses, state.variableIncomes)
  const totalMonthlyFixed = getTotalMonthlyFixed(state.fixedExpenses)
  const portfolioValue = getPortfolioValue(state.securities)
  const assetValue = getTotalAssetValue(state.assets)
  const pensionValue = getTotalPensionValue(state.pensions)
  const totalWealth = portfolioValue + assetValue + pensionValue
  const savingsRate = getSavingsRate(monthlyBalance, effectiveMonthlyIncome)
  const efBase = getEmergencyFundMonthlyBase(state.fixedExpenses, state.variableExpenses)
  const efMonths = getEmergencyFundCoverageMonths(state.assets, state.fixedExpenses, state.variableExpenses)
  const alerts = getFinancialAlerts(savingsRate, monthlyBalance, effectiveMonthlyIncome, totalMonthlyFixed, state.securities, state.pensions, efMonths, efBase)

  useEffect(() => {
    if (!alertsOpen) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setAlertsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [alertsOpen])

  return (
    <header className="h-14 glass !rounded-none border-b border-white/[0.05] flex items-center justify-between px-5 sticky top-0 z-10">
      <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>

      <div className="flex items-center gap-2">
        {/* Monthly balance pill */}
        <div className={`px-3 py-1 rounded-full text-xs font-semibold font-mono backdrop-blur-sm border ${
          monthlyBalance >= 0
            ? 'bg-gold/10 border-gold/20 text-gold-light'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {fmt(monthlyBalance)}
        </div>

        {/* Alerts bell */}
        {alerts.length > 0 && (
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setAlertsOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-gold transition-colors relative cursor-pointer"
              title={`${alerts.length} alert finanziari`}
            >
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gold text-surface-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            </button>
            {alertsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 glass !border-white/10 rounded-xl shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Alert Finanziari</p>
                  <button onClick={() => setAlertsOpen(false)} className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
                  {alerts.map((alert, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <AlertTriangle size={13} className="text-gold mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-300 leading-relaxed">{alert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy toggle */}
        <button
          onClick={toggle}
          title={privacyMode ? 'Mostra importi' : 'Nascondi importi'}
          className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
            privacyMode ? 'text-accent bg-accent/10' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
          }`}
        >
          {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Verify:** Header is 56px tall, glass panel, monthly balance pill shows gold/red, bell icon gold, privacy toggle works

- [ ] **Commit:**
```bash
git add src/components/layout/Header.tsx
git commit -m "style: glass Header with compact balance pill"
```

---

### Task 6: Welcome screen + routing

**Files:**
- Create: `src/components/welcome/Welcome.tsx`
- Modify: `src/App.tsx`

- [ ] **Create `src/components/welcome/Welcome.tsx`:**

```tsx
import { useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getMonthlyBalance,
} from '../../utils/calculations'
import { formatCurrency } from '../../utils/format'

export function Welcome() {
  const navigate = useNavigate()
  const { state } = useApp()

  const portfolioValue = getPortfolioValue(state.securities)
  const monthlyBalance = getMonthlyBalance(
    state.settings, state.fixedExpenses, state.variableExpenses, state.variableIncomes,
  )
  const totalAssets = state.assets.reduce((s, a) => s + a.value, 0)
  const hasData = portfolioValue > 0 || totalAssets > 0

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #040d12 0%, #061a20 50%, #0a1a10 100%)' }}
    >
      {/* Background glows */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)' }}
      />
      <div
        className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)' }}
      />

      {/* Decorative floating cards */}
      <div
        className="absolute top-[12%] right-[8%] glass rounded-2xl px-4 py-3 w-36 pointer-events-none hidden lg:block"
        style={{ transform: 'rotate(3deg)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/70">Portfolio</p>
        <p className="text-base font-bold text-accent-light font-mono mt-0.5">
          {hasData ? formatCurrency(portfolioValue) : '€ —'}
        </p>
      </div>
      <div
        className="absolute bottom-[22%] right-[6%] glass rounded-2xl px-4 py-3 w-36 pointer-events-none opacity-70 hidden lg:block"
        style={{ transform: 'rotate(-2deg)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gold/70">Bilancio</p>
        <p className="text-base font-bold text-gold-light font-mono mt-0.5">
          {hasData ? formatCurrency(monthlyBalance) : '€ —'}
        </p>
      </div>
      <div
        className="absolute bottom-[28%] left-[5%] glass rounded-2xl px-4 py-3 w-32 pointer-events-none opacity-50 hidden lg:block"
        style={{ transform: 'rotate(2deg)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Asset</p>
        <p className="text-sm font-bold text-white font-mono mt-0.5 truncate">
          {hasData ? formatCurrency(totalAssets) : '—'}
        </p>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
        <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-dark rounded-2xl flex items-center justify-center mb-5 shadow-[0_8px_32px_rgba(16,185,129,0.4)]">
          <Wallet size={28} className="text-white" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Moneybud</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Gestisci il tuo patrimonio.<br />Tutto in locale. Tutto tuo.
        </p>

        <button
          onClick={() => navigate('/')}
          className="px-10 py-3 bg-gradient-to-r from-accent to-accent-dark text-white font-bold rounded-xl shadow-[0_6px_24px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_28px_rgba(16,185,129,0.5)] transition-all duration-200 text-base cursor-pointer"
        >
          Inizia →
        </button>

        <p className="text-xs text-slate-600 mt-5 leading-relaxed">
          <span className="text-slate-500">Nessun dato inviato a server esterni.</span><br />
          Tutti i dati sono salvati localmente nel tuo browser.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Replace `src/App.tsx`:**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { Portfolio } from './components/portfolio/Portfolio'
import { Expenses } from './components/expenses/Expenses'
import { Assets } from './components/assets/Assets'
import { Pension } from './components/pension/Pension'
import { FinancialAdvice } from './components/advice/FinancialAdvice'
import { Settings } from './components/settings/Settings'
import { Welcome } from './components/welcome/Welcome'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone welcome screen — no Layout wrapper */}
          <Route path="/welcome" element={<Welcome />} />

          {/* App shell — all other routes inside Layout */}
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
  )
}
```

- [ ] **Verify:**
  - Navigate to `http://localhost:5173/welcome` → full-screen welcome screen with glows and floating cards
  - Click "Inizia →" → navigates to Dashboard at `/`
  - All other routes still work

- [ ] **Commit:**
```bash
git add src/components/welcome/Welcome.tsx src/App.tsx
git commit -m "feat: Welcome screen and updated routing"
```

---

**Phase 1 complete.** The app now has the full glassmorphism shell: tokens, glass utilities, all UI primitives restyled, icon-only sidebar with tooltips, compact glass header, and welcome screen. Page content (Dashboard, Portfolio, etc.) still uses old internal layout — that is Phase 2 and 3.
