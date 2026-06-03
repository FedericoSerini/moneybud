import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getPortfolioCost, getSecurityGrossGain, getSecurityTaxEstimate,
  getSecurityNetGain, getTotalAnnualTERCost,
} from '../../utils/calculations'
import { formatCurrency, formatPercent } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { AddSecurityModal } from './AddSecurityModal'
import { Security, SecurityType } from '../../types'

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const PrivacyChart = ({ height = 180 }: { height?: number }) => (
  <div style={{ height }} className="flex items-center justify-center glass rounded-lg">
    <p className="text-slate-500 text-sm">Modalità privacy attiva</p>
  </div>
)

interface SecuritiesSectionProps {
  securities: Security[]
  defaultType: SecurityType
  emptyMessage: string
}

export function SecuritiesSection({ securities, defaultType, emptyMessage }: SecuritiesSectionProps) {
  const { addSecurity, updateSecurity, deleteSecurity, updateSecurityPrice } = useApp()
  const { privacyMode, fmt } = usePrivacy()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Security | undefined>()
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [historyData, setHistoryData] = useState<{ symbol: string; data: { date: string; close: number }[] } | null>(null)

  const portfolioValue   = getPortfolioValue(securities)
  const portfolioCost    = getPortfolioCost(securities)
  const totalGross       = securities.reduce((s, sec) => s + getSecurityGrossGain(sec), 0)
  const totalTax         = securities.reduce((s, sec) => s + getSecurityTaxEstimate(sec), 0)
  const totalNet         = securities.reduce((s, sec) => s + getSecurityNetGain(sec), 0)
  const totalTERCostYear = defaultType === 'etf' ? getTotalAnnualTERCost(securities) : 0
  const totalGrossPct    = portfolioCost > 0 ? (totalGross / portfolioCost) * 100 : 0
  const totalNetPct      = portfolioCost > 0 ? (totalNet / portfolioCost) * 100 : 0

  const fetchPrice = async (sec: Security) => {
    setLoadingIds((prev) => new Set([...prev, sec.id]))
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sec.symbol)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      updateSecurityPrice(sec.id, data.price, data.change, data.changePercent)
    } catch { /* silent */ }
    finally {
      setLoadingIds((prev) => { const s = new Set(prev); s.delete(sec.id); return s })
    }
  }

  const refreshAll = async () => {
    setRefreshingAll(true)
    await Promise.all(securities.map(fetchPrice))
    setRefreshingAll(false)
  }

  const loadHistory = async (sec: Security) => {
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sec.symbol)}/history?range=1y&interval=1wk`)
      if (!res.ok) return
      const data = await res.json()
      setHistoryData({ symbol: sec.symbol, data })
    } catch {}
  }

  const handleSave = (data: Omit<Security, 'id'>) => {
    if (editTarget) updateSecurity(editTarget.id, data)
    else addSecurity(data)
    setEditTarget(undefined)
    setModalOpen(false)
  }

  const pieData = securities.map((s) => ({
    name: s.symbol,
    value: s.quantity * (s.currentPrice ?? s.purchasePrice),
  }))

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Controvalore',   value: fmt(portfolioValue), sub: `${securities.length} posizioni`, color: 'text-white' },
          { label: 'P&L Lordo',      value: fmt(totalGross),     sub: formatPercent(totalGrossPct),     color: totalGross >= 0 ? 'text-accent' : 'text-red-400' },
          { label: 'Tasse Stimate',  value: fmt(totalTax),       sub: 'Solo su plusvalenze',            color: 'text-amber-400' },
          { label: 'P&L Netto',      value: fmt(totalNet),       sub: formatPercent(totalNetPct),       color: totalNet >= 0 ? 'text-accent' : 'text-red-400' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* TER info bar — ETF only */}
      {totalTERCostYear > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 glass-info rounded-xl text-blue-300 text-sm">
          <Info size={15} className="shrink-0" />
          <span>
            Costo TER stimato: <strong className="text-white">{fmt(totalTERCostYear)}/anno</strong> ({fmt(totalTERCostYear / 12)}/mese) — già incluso nel NAV, utile per la pianificazione.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Table */}
        <Card className="col-span-2">
          <CardHeader
            title="Posizioni"
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={refreshAll} loading={refreshingAll}>
                  <RefreshCw size={13} /> Aggiorna
                </Button>
                <Button size="sm" onClick={() => { setEditTarget(undefined); setModalOpen(true) }}>
                  <Plus size={13} /> Aggiungi
                </Button>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Simbolo', 'Qt.', 'Acq.', 'Att.', 'Var.', 'Valore', 'P&L netto', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {securities.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">{emptyMessage}</td></tr>
                )}
                {securities.map((sec) => {
                  const currentPrice = sec.currentPrice ?? sec.purchasePrice
                  const value        = sec.quantity * currentPrice
                  const grossGain    = getSecurityGrossGain(sec)
                  const netGain      = getSecurityNetGain(sec)
                  const netPct       = getPortfolioCost([sec]) > 0 ? (netGain / getPortfolioCost([sec])) * 100 : 0
                  const changeColor  = (sec.currentChangePercent ?? 0) >= 0 ? 'text-accent' : 'text-red-400'
                  const pnlColor     = netGain >= 0 ? 'text-accent' : 'text-red-400'

                  return (
                    <tr key={sec.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono font-semibold text-white text-sm">{sec.symbol}</p>
                            {sec.ter && <span className="text-[10px] text-slate-600">TER {sec.ter}%</span>}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[120px]">{sec.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-sm">{sec.quantity}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-sm">{fmt(sec.purchasePrice)}</td>
                      <td className="px-4 py-3 font-mono text-white text-sm font-medium">
                        {fmt(currentPrice)}
                        {sec.lastUpdated && (
                          <div className="text-[10px] text-slate-600">
                            {new Date(sec.lastUpdated).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${changeColor}`}>
                        {sec.currentChangePercent !== undefined ? formatPercent(sec.currentChangePercent) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-white text-sm">{fmt(value)}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${pnlColor}`}>
                        <div>{fmt(netGain)}</div>
                        <div className="opacity-70">{formatPercent(netPct)}</div>
                        <div className="text-slate-600">lordo {fmt(grossGain)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => fetchPrice(sec)} disabled={loadingIds.has(sec.id)} className="p-1.5 text-slate-500 hover:text-accent rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-50" title="Aggiorna">
                            <RefreshCw size={13} className={loadingIds.has(sec.id) ? 'animate-spin' : ''} />
                          </button>
                          <button onClick={() => loadHistory(sec)} className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-white/[0.06] transition-colors" title="Storico">
                            <ExternalLink size={13} />
                          </button>
                          <button onClick={() => { setEditTarget(sec); setModalOpen(true) }} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteSecurity(sec.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Allocazione" />
            <div className="px-5 pb-5">
              {pieData.length > 0 ? (
                <>
                  {privacyMode ? (
                    <PrivacyChart height={180} />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="space-y-2 mt-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-slate-400 font-mono">{d.name}</span>
                        </div>
                        <span className="text-slate-300">{portfolioValue > 0 ? `${((d.value / portfolioValue) * 100).toFixed(1)}%` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-500 text-xs">Aggiungi posizioni</div>
              )}
            </div>
          </Card>

          {historyData && (
            <Card>
              <CardHeader title={`Storico ${historyData.symbol}`} subtitle="52 settimane" />
              <div className="px-4 pb-4">
                {privacyMode ? (
                  <PrivacyChart height={140} />
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={historyData.data}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, 'Prezzo']} contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', backdropFilter: 'blur(16px)' }} />
                      <Line type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <AddSecurityModal
        key={editTarget?.id ?? `new-${defaultType}`}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined) }}
        onSave={handleSave}
        initial={editTarget}
        defaultType={defaultType}
      />
    </>
  )
}
