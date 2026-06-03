import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Target, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Receipt, Droplets, X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getTotalAssetValue, getTotalWealth, getMonthlyBalance, getSavingsRate,
  getProjections, getFinancialAlerts, getTotalMonthlyFixed, getVariableExpensesByMonth,
  getFinancialHealthScore, getTotalPensionValue, shouldShowVariableExpenseAlert,
  shouldShowLiquidityAlert, getPotentialMonthlyIncome, getTotalBondValue,
  getEmergencyFundMonthlyBase, getEmergencyFundCoverageMonths,
  getSecurityTaxEstimate, getSecurityNetGain,
  getBondCost, getBondNetGain,
  getPACTotalInvested, getPACGrossGain, getPACTERCost,
  getMonthlyVariableIncome,
} from '../../utils/calculations'
import { formatCurrency, formatPercent, currentMonthLabel } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { useNavigate } from 'react-router-dom'

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']

type WealthRange = 30 | 60 | 180 | 365
const RANGE_LABELS: Record<WealthRange, string> = {
  30:  '30 giorni',
  60:  '2 mesi',
  180: '6 mesi',
  365: '12 mesi',
}

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
    amber:  'text-gold bg-gold/10',
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

const PrivacyChart = ({ height = 200 }: { height?: number }) => (
  <div
    style={{ height }}
    className="flex items-center justify-center glass rounded-lg"
  >
    <p className="text-slate-500 text-sm">Modalità privacy attiva</p>
  </div>
)

export function Dashboard() {
  const { state, recordWealthSnapshot, dismissAlert } = useApp()
  const { privacyMode, fmt } = usePrivacy()
  const navigate = useNavigate()
  const [wealthRange, setWealthRange] = useState<WealthRange>(30)

  const effectiveMonthlyIncome = getMonthlyVariableIncome(state.variableIncomes)
  const portfolioValue = getPortfolioValue(state.securities)
  const bondValue      = getTotalBondValue(state.bonds)
  const pacValue       = state.pacPlans.reduce((sum, plan) => {
    return sum + (plan.currentPrice && plan.purchases.length > 0
      ? plan.purchases.reduce((s, p) => s + p.quantity, 0) * plan.currentPrice
      : plan.purchases.reduce((s, p) => s + p.amount + p.commission, 0))
  }, 0)

  const totalPortfolioValue = portfolioValue + bondValue + pacValue
  const assetValue     = getTotalAssetValue(state.assets)
  const pensionValue   = getTotalPensionValue(state.pensions)
  const totalWealth    = getTotalWealth(state.securities, state.assets, state.pensions, state.pacPlans, state.bonds)
  const monthlyBalance = getMonthlyBalance(state.settings, state.fixedExpenses, state.variableExpenses, state.variableIncomes)
  const savingsRate    = getSavingsRate(monthlyBalance, effectiveMonthlyIncome)
  const projections    = getProjections(totalWealth, monthlyBalance, state.settings.expectedReturn)
  const totalMonthlyFixed = getTotalMonthlyFixed(state.fixedExpenses)
  const efBase         = getEmergencyFundMonthlyBase(state.fixedExpenses, state.variableExpenses)
  const efMonths       = getEmergencyFundCoverageMonths(state.assets, state.fixedExpenses, state.variableExpenses)
  const alerts         = getFinancialAlerts(savingsRate, monthlyBalance, effectiveMonthlyIncome, totalMonthlyFixed, state.securities, state.pensions, efMonths, efBase, state.bonds, state.pacPlans)
  const healthScore    = getFinancialHealthScore(savingsRate, effectiveMonthlyIncome, totalMonthlyFixed, state.securities, state.pensions, totalWealth, efMonths, state.bonds, state.pacPlans)
  const monthlyVariableData = getVariableExpensesByMonth(state.variableExpenses, 6)

  const showVarExpAlert    = shouldShowVariableExpenseAlert(state.variableExpenses, state.settings.alertVariableExpenses, state.alertDismissals)
  const showLiquidityAlert = shouldShowLiquidityAlert(state.assets, state.settings.alertLiquidity, state.alertDismissals)
  // Total amount actually invested (no taxes in denominator — consistent with InvestmentReport)
  const totalInvested =
    state.securities.reduce((s, sec) => s + sec.quantity * sec.purchasePrice + (sec.commissions ?? 0), 0) +
    state.bonds.reduce((s, b) => s + getBondCost(b), 0) +
    state.pacPlans.reduce((s, plan) => s + getPACTotalInvested(plan), 0)

  // Net gain = gross gain − taxes − PAC TER costs (same logic as InvestmentReport)
  const portfolioNetGain =
    state.securities.reduce((s, sec) => s + getSecurityNetGain(sec), 0) +
    state.bonds.reduce((s, b) => s + getBondNetGain(b), 0) +
    state.pacPlans.reduce((s, plan) => {
      const gross = getPACGrossGain(plan)
      const tax = Math.max(0, gross - getPACTERCost(plan)) * (plan.taxRate ?? 26) / 100
      return s + gross - tax - getPACTERCost(plan)
    }, 0)

  const portfolioGainPct = totalInvested > 0 ? (portfolioNetGain / totalInvested) * 100 : 0

  const wealthBreakdown = [
    { name: 'Portfolio', value: totalPortfolioValue },
    { name: 'Asset',     value: assetValue },
    { name: 'Pensione',  value: pensionValue },
  ].filter((d) => d.value > 0)

  const historyData = state.wealthHistory
    .slice(-wealthRange)
    .map((h) => ({ date: h.date.slice(5), total: h.total }))

  const scoreColor = healthScore >= 70 ? 'text-accent' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'
  const scoreLabel = healthScore >= 70 ? 'Buona' : healthScore >= 40 ? 'Sufficiente' : 'Da migliorare'

  useEffect(() => {
    if (totalWealth > 0) recordWealthSnapshot(portfolioValue + bondValue, assetValue, pensionValue)
  }, [])

  return (
    <div className="space-y-6">
      {/* Reminder alerts */}
      {showVarExpAlert && (
        <div className="flex items-center justify-between px-4 py-3 glass-info rounded-xl">
          <div className="flex items-center gap-3 text-blue-300 text-sm">
            <Receipt size={16} className="shrink-0" />
            <span>Non registri spese variabili da più di 7 giorni. Aggiorna il tracker!</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/spese')} className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors">Vai alle spese</button>
            <button onClick={() => dismissAlert('variableExpenses')} className="p-1 text-blue-500 hover:text-blue-300 transition-colors"><X size={14} /></button>
          </div>
        </div>
      )}
      {showLiquidityAlert && (
        <div className="flex items-center justify-between px-4 py-3 glass-gold rounded-xl">
          <div className="flex items-center gap-3 text-amber-300 text-sm">
            <Droplets size={16} className="shrink-0" />
            <span>Fine mese: aggiorna il valore della liquidità (conto corrente, cassa) nella sezione Asset.</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/asset')} className="text-xs font-medium text-amber-400 hover:text-amber-300 underline transition-colors">Vai agli asset</button>
            <button onClick={() => dismissAlert('liquidity')} className="p-1 text-amber-500 hover:text-amber-300 transition-colors"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Financial alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 glass-gold rounded-xl text-gold text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Patrimonio Totale" value={fmt(totalWealth)} sub="Portfolio + Asset + Pensione" icon={Wallet} color="accent" />
        <StatCard title="Portfolio" value={fmt(totalPortfolioValue)} sub="Titoli, ETF, PAC, bond, crypto…" icon={TrendingUp} trend={portfolioGainPct} color="blue" />
        <StatCard title="Bilancio Mensile" value={fmt(monthlyBalance)} sub={currentMonthLabel()} icon={monthlyBalance >= 0 ? TrendingUp : TrendingDown} color={monthlyBalance >= 0 ? 'accent' : 'red'} />
        <StatCard title="Tasso Risparmio" value={`${savingsRate.toFixed(1)}%`} sub="del reddito mensile" icon={Target} color={savingsRate >= 20 ? 'accent' : savingsRate >= 10 ? 'amber' : 'red'} />
      </div>

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
                  type="button"
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

      {/* Projections */}
      <Card>
        <CardHeader
          title="Proiezioni Patrimonio"
          subtitle={`Rendimento atteso: ${state.settings.expectedReturn}% annuo · Risparmio mensile: ${fmt(Math.max(0, monthlyBalance))}`}
        />
        <div className="px-5 pb-5">
          {privacyMode ? (
            <PrivacyChart height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projections} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {projections.map((p) => (
              <div key={p.year} className="text-center">
                <p className="text-xs text-slate-500">{p.label}</p>
                <p className="text-sm font-mono font-semibold text-accent mt-0.5">{fmt(p.value)}</p>
                {totalWealth > 0 && !privacyMode && (
                  <p className="text-xs text-slate-600 mt-0.5">+{formatPercent(((p.value - totalWealth) / totalWealth) * 100, 0)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Monthly variable expenses trend */}
      <Card>
        <CardHeader title="Spese Variabili" subtitle="Ultimi 6 mesi" />
        <div className="px-5 pb-5">
          {privacyMode ? (
            <PrivacyChart height={160} />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyVariableData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}
