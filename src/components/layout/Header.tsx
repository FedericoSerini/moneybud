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
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
        <span className="text-[10px] font-mono text-slate-600">v{__APP_VERSION__}</span>
      </div>

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
              type="button"
              onClick={() => setAlertsOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-gold transition-colors relative cursor-pointer"
              title={`${alerts.length} alert finanziari`}
              aria-label={`${alerts.length} alert finanziari`}
            >
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gold text-[#040d12] text-[9px] font-bold rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            </button>
            {alertsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 glass !border-white/10 rounded-xl shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Alert Finanziari</p>
                  <button type="button" onClick={() => setAlertsOpen(false)} className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer">
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
          type="button"
          onClick={toggle}
          title={privacyMode ? 'Mostra importi' : 'Nascondi importi'}
          aria-label={privacyMode ? 'Mostra importi' : 'Nascondi importi'}
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
