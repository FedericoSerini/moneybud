import { useState } from 'react'
import { Lightbulb, AlertTriangle, TrendingUp, Star, RefreshCw, Lock, CheckCircle, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue,
  getTotalAssetValue,
  getMonthlyBalance,
  getSavingsRate,
  getTotalMonthlyFixed,
  getFinancialHealthScore,
  getFinancialAlerts,
  getTotalPensionValue,
  getTotalMonthlyPensionContrib,
  getPotentialMonthlyIncome,
  estimateAdviceCostEur,
  getEmergencyFundMonthlyBase,
  getEmergencyFundCoverageMonths,
  getMonthlyVariableIncome,
} from '../../utils/calculations'
import { formatCurrency } from '../../utils/format'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

function parseAdviceText(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <h4 key={i} className="text-white font-semibold mt-4 mb-2 first:mt-0">{line.replace(/\*\*/g, '')}</h4>
    }
    if (line.startsWith('# ')) {
      return <h3 key={i} className="text-accent font-bold text-lg mt-4 mb-2">{line.replace('# ', '')}</h3>
    }
    if (line.startsWith('## ')) {
      return <h4 key={i} className="text-white font-semibold mt-3 mb-1">{line.replace('## ', '')}</h4>
    }
    if (line.match(/^\d+\.\s/)) {
      return <p key={i} className="text-slate-300 text-sm mb-1 pl-4">{line}</p>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 text-sm text-slate-300 mb-1">
          <span className="text-accent shrink-0 mt-1">•</span>
          <span>{line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    // Handle inline bold
    const parts = line.split(/\*\*(.*?)\*\*/g)
    if (parts.length > 1) {
      return (
        <p key={i} className="text-slate-300 text-sm mb-1">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
        </p>
      )
    }
    return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
  })
}

export function FinancialAdvice() {
  const { state } = useApp()
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  const effectiveMonthlyIncome = getMonthlyVariableIncome(state.variableIncomes)
  const portfolioValue = getPortfolioValue(state.securities)
  const assetValue = getTotalAssetValue(state.assets)
  const pensionValue = getTotalPensionValue(state.pensions)
  const totalWealth = portfolioValue + assetValue + pensionValue
  const monthlyBalance = getMonthlyBalance(state.settings, state.fixedExpenses, state.variableExpenses, state.variableIncomes)
  const savingsRate = getSavingsRate(monthlyBalance, effectiveMonthlyIncome)
  const totalMonthlyFixed = getTotalMonthlyFixed(state.fixedExpenses)
  const efBase = getEmergencyFundMonthlyBase(state.fixedExpenses, state.variableExpenses)
  const efMonths = getEmergencyFundCoverageMonths(state.assets, state.fixedExpenses, state.variableExpenses)
  const estimatedCost = estimateAdviceCostEur(
    state.securities.length,
    state.pensions.length,
    state.fixedExpenses.length,
    state.assets.length,
    state.pacPlans.length,
  )
  const healthScore = getFinancialHealthScore(
    savingsRate,
    effectiveMonthlyIncome,
    totalMonthlyFixed,
    state.securities,
    state.pensions,
    totalWealth,
    efMonths,
    state.bonds,
    state.pacPlans
  )
  const alerts = getFinancialAlerts(
    savingsRate,
    monthlyBalance,
    effectiveMonthlyIncome,
    totalMonthlyFixed,
    state.securities,
    state.pensions,
    efMonths,
    efBase,
    state.bonds,
    state.pacPlans
  )

  const hasApiKey = Boolean(state.settings.claudeApiKey)

  const generateAdvice = async () => {
    if (!hasApiKey) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: state.settings.claudeApiKey,
          financialData: {
            portfolio: state.securities,
            assets: state.assets,
            fixedExpenses: state.fixedExpenses,
            variableExpenses: state.variableExpenses,
            variableIncomes: state.variableIncomes,
            pensions: state.pensions,
            pacPlans: state.pacPlans,
            settings: state.settings,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore generazione')
      setAdvice(data.advice)
      setLastGenerated(new Date().toLocaleTimeString('it-IT'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = healthScore >= 70 ? 'text-accent' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = healthScore >= 70 ? 'glass-emerald' : healthScore >= 40 ? 'glass-gold' : 'glass-danger'
  const scoreLabel = healthScore >= 70 ? 'Buona' : healthScore >= 40 ? 'Sufficiente' : 'Da migliorare'

  // Quick tips based on score/alerts
  const quickTips: { text: string; type: 'good' | 'warn' | 'bad' }[] = []
  if (savingsRate >= 20) quickTips.push({ text: `Ottimo tasso di risparmio: ${savingsRate.toFixed(1)}%`, type: 'good' })
  else quickTips.push({ text: `Tasso di risparmio: ${savingsRate.toFixed(1)}% (obiettivo 20%)`, type: savingsRate >= 10 ? 'warn' : 'bad' })
  if (state.securities.length >= 3) quickTips.push({ text: `Portafoglio diversificato: ${state.securities.length} posizioni`, type: 'good' })
  else quickTips.push({ text: 'Diversifica il portafoglio con più strumenti', type: 'warn' })
  const totalMonthlyPension = getTotalMonthlyPensionContrib(state.pensions, effectiveMonthlyIncome)
  if (state.pensions.length > 0 && totalMonthlyPension > 0) {
    quickTips.push({ text: `${state.pensions.length} fondo${state.pensions.length > 1 ? ' pensione attivi' : ' pensione attivo'}: +${formatCurrency(totalMonthlyPension)}/mese`, type: 'good' })
  } else {
    quickTips.push({ text: 'Avvia un fondo pensione il prima possibile', type: 'bad' })
  }
  const fixedRatio = effectiveMonthlyIncome > 0 ? (totalMonthlyFixed / effectiveMonthlyIncome) * 100 : 0
  if (fixedRatio < 40) quickTips.push({ text: `Spese fisse sostenibili: ${fixedRatio.toFixed(0)}% del reddito`, type: 'good' })
  else quickTips.push({ text: `Spese fisse elevate: ${fixedRatio.toFixed(0)}% del reddito`, type: fixedRatio < 55 ? 'warn' : 'bad' })

  if (efMonths >= 12) {
    quickTips.push({ text: `Fondo emergenza PERFETTO: ${efMonths.toFixed(1)} mesi coperti`, type: 'good' })
  } else if (efMonths >= 6) {
    quickTips.push({ text: `Fondo emergenza ottimo: ${efMonths.toFixed(1)} mesi coperti`, type: 'good' })
  } else if (efMonths >= 3) {
    quickTips.push({ text: `Fondo emergenza parziale: ${efMonths.toFixed(1)}/6 mesi (obiettivo minimo)`, type: 'warn' })
  } else if (efMonths > 0) {
    quickTips.push({ text: `Fondo emergenza insufficiente: ${efMonths.toFixed(1)}/6 mesi`, type: 'bad' })
  } else {
    quickTips.push({ text: 'Nessun fondo di emergenza (punta a 6 mesi di spese fisse + alimentari)', type: 'bad' })
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 glass-info rounded-xl text-blue-300 text-sm">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Disclaimer:</strong> I consigli generati dall'AI sono a scopo puramente informativo e non costituiscono consulenza finanziaria professionale. Non fare affidamento esclusivo su questi suggerimenti per decisioni di investimento. Consulta sempre un consulente finanziario qualificato.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Health score and quick tips */}
        <div className="space-y-4">
          <Card className={scoreBg}>
            <div className="p-5 flex flex-col items-center gap-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Score Salute Finanziaria</p>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeDasharray={`${(healthScore / 100) * 314} 314`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreColor}`}>{healthScore}</span>
                  <span className="text-xs text-slate-500">/100</span>
                </div>
              </div>
              <Badge variant={healthScore >= 70 ? 'green' : healthScore >= 40 ? 'yellow' : 'red'} size="md">
                {scoreLabel}
              </Badge>
            </div>
          </Card>

          <Card>
            <CardHeader title="Analisi Rapida" />
            <div className="px-4 pb-4 space-y-2">
              {quickTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {tip.type === 'good'
                    ? <CheckCircle size={13} className="text-accent shrink-0 mt-0.5" />
                    : tip.type === 'warn'
                    ? <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                  <span className={tip.type === 'good' ? 'text-slate-300' : tip.type === 'warn' ? 'text-amber-300' : 'text-red-300'}>
                    {tip.text}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {alerts.length > 0 && (
            <Card>
              <CardHeader title="Alert" />
              <div className="px-4 pb-4 space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
                    {a}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* AI Advice */}
        <Card className="col-span-2">
          <CardHeader
            title="Consigli Finanziari AI"
            subtitle={lastGenerated ? `Generato alle ${lastGenerated}` : 'Powered by Claude'}
            action={
              hasApiKey ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">~€{estimatedCost.toFixed(4)}/richiesta</span>
                  <Button size="sm" onClick={generateAdvice} loading={loading}>
                    <RefreshCw size={13} />
                    {advice ? 'Rigenera' : 'Genera consigli'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" disabled>
                  <Lock size={13} />
                  API key richiesta
                </Button>
              )
            }
          />
          <div className="px-5 pb-5">
            {!hasApiKey && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="w-14 h-14 bg-white/[0.06] rounded-2xl flex items-center justify-center">
                  <Lock size={24} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-white font-medium">API Key richiesta</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Vai in <strong>Impostazioni</strong> e inserisci la tua Anthropic API key per ricevere consigli finanziari personalizzati.
                  </p>
                </div>
              </div>
            )}

            {hasApiKey && !advice && !loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                  <Lightbulb size={24} className="text-accent" />
                </div>
                <div>
                  <p className="text-white font-medium">Pronto per l'analisi</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Clicca "Genera consigli" per ricevere un'analisi personalizzata della tua situazione finanziaria.
                  </p>
                </div>
                <Button onClick={generateAdvice}>
                  <Lightbulb size={15} />
                  Genera consigli personalizzati
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center animate-pulse">
                  <Star size={24} className="text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Analisi in corso…</p>
                  <p className="text-slate-400 text-sm mt-1">Claude sta elaborando la tua situazione finanziaria</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 glass-danger rounded-xl text-red-400 text-sm">
                <XCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {advice && !loading && (
              <div className="prose prose-invert max-w-none">
                <div className="text-sm leading-relaxed">{parseAdviceText(advice)}</div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
