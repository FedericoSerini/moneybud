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
          type="button"
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
