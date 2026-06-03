import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getPortfolioCost,
  getSecurityGrossGain, getSecurityTaxEstimate, getSecurityNetGain,
  getPACTotalInvested, getPACTotalQuantity, getPACCurrentValue, futureValue,
  getPACTaxEstimate,
  getPACTotalCost,
} from '../../utils/calculations'
import { formatPercent, formatDate } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { PACPlan, PACPurchase } from '../../types'

// ─── PAC Plan modal ───────────────────────────────────────────────────────────

function PACPlanModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (p: Omit<PACPlan, 'id' | 'purchases'>) => void
  initial?: PACPlan
}) {
  const [form, setForm] = useState({
    symbol: initial?.symbol ?? '',
    name: initial?.name ?? '',
    monthlyAmount: initial?.monthlyAmount?.toString() ?? '',
    startDate: initial?.startDate ?? new Date().toISOString().split('T')[0],
    endDate: initial?.endDate ?? '',
    ter: initial?.ter?.toString() ?? '',
    active: initial?.active ?? true,
    notes: initial?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.symbol.trim()) e.symbol = 'Simbolo richiesto'
    if (!form.name.trim()) e.name = 'Nome richiesto'
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) e.monthlyAmount = 'Importo richiesto'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name.trim(),
      monthlyAmount: Number(form.monthlyAmount),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      ter: form.ter ? Number(form.ter) : undefined,
      active: form.active,
      notes: form.notes || undefined,
      taxRate: 26,  // default imposta sostitutiva
    })
    onClose()
  }

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica PAC' : 'Nuovo PAC'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Simbolo" placeholder="SWDA.L" value={form.symbol} onChange={(e) => set('symbol', e.target.value)} error={errors.symbol} />
          <Input label="Nome strumento" placeholder="iShares MSCI World" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        </div>
        <Input label="Importo mensile" type="number" prefix="€" value={form.monthlyAmount} onChange={(e) => set('monthlyAmount', e.target.value)} error={errors.monthlyAmount} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data inizio" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          <Input label="Data fine (opzionale)" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="TER annuo (%)" type="number" step="0.01" suffix="%" placeholder="0.20" value={form.ter} onChange={(e) => set('ter', e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Stato</label>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-accent' : 'bg-white/[0.12]'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-1 ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-300">{form.active ? 'Attivo' : 'Sospeso'}</span>
            </div>
          </div>
        </div>
        <Input label="Note (opzionale)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Crea PAC'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Purchase modal ───────────────────────────────────────────────────────────

function PurchaseModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (p: Omit<PACPurchase, 'id'>) => void
  initial?: PACPurchase
}) {
  const [form, setForm] = useState({
    date: initial?.date ?? new Date().toISOString().split('T')[0],
    price: initial?.price?.toString() ?? '',
    quantity: initial?.quantity?.toString() ?? '',
    amount: initial?.amount?.toString() ?? '',
    commission: (initial?.commission ?? 0).toString(),
  })

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v }
    if ((k === 'price' || k === 'quantity') && updated.price && updated.quantity) {
      updated.amount = (Number(updated.price) * Number(updated.quantity)).toFixed(2)
    }
    setForm(updated)
  }

  const handleSubmit = () => {
    if (!form.price || !form.quantity) return
    onSave({
      date: form.date,
      price: Number(form.price),
      quantity: Number(form.quantity),
      amount: Number(form.amount) || Number(form.price) * Number(form.quantity),
      commission: Number(form.commission) || 0,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Acquisto' : 'Registra Acquisto PAC'}>
      <div className="space-y-4">
        <Input label="Data acquisto" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prezzo unitario" type="number" step="0.0001" prefix="€" value={form.price} onChange={(e) => set('price', e.target.value)} />
          <Input label="Quantità acquistata" type="number" step="0.001" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Importo totale" type="number" step="0.01" prefix="€" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          <Input label="Commissione" type="number" step="0.01" prefix="€" placeholder="0.00" value={form.commission} onChange={(e) => set('commission', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Registra'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Etf() {
  const { state, addPACPlan, updatePACPlan, deletePACPlan, addPACPurchase, deletePACPurchase, updateSecurityPrice } = useApp()
  const { fmt } = usePrivacy()
  const [planModal, setPlanModal]     = useState(false)
  const [purchaseModal, setPurchaseModal] = useState<{ planId: string; initial?: PACPurchase } | null>(null)
  const [editPlan, setEditPlan]       = useState<PACPlan | undefined>()
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [loadingPrices, setLoadingPrices] = useState<Set<string>>(new Set())
  const [prices, setPrices]           = useState<Record<string, number>>({})

  // ── ETF securities ──────────────────────────────────────────────────────────
  const etfs         = state.securities.filter((s) => s.type === 'etf')
  const etfValue     = getPortfolioValue(etfs)
  const etfCost      = getPortfolioCost(etfs)
  const etfGross     = etfs.reduce((s, sec) => s + getSecurityGrossGain(sec), 0)
  const etfTax       = etfs.reduce((s, sec) => s + getSecurityTaxEstimate(sec), 0)
  const etfNet       = etfs.reduce((s, sec) => s + getSecurityNetGain(sec), 0)

  // ── PAC plans ───────────────────────────────────────────────────────────────
  const pacInvested  = state.pacPlans.reduce((s, p) => s + getPACTotalInvested(p), 0)
  const pacValue     = state.pacPlans.reduce((sum, plan) => {
    const price = prices[plan.symbol] ?? plan.currentPrice ?? state.securities.find((s) => s.symbol === plan.symbol)?.currentPrice
    return sum + getPACCurrentValue(plan, price)
  }, 0)
  const pacGross     = pacValue - pacInvested
  const pacTax       = state.pacPlans.reduce((s, p) => s + getPACTaxEstimate(p), 0)
  const pacNet       = pacGross - pacTax - (state.pacPlans.reduce((s, p) => s + getPACTotalCost(p), 0) - pacInvested)  // consider effective cost including estimated taxes

  // ── Combined totals ─────────────────────────────────────────────────────────
  const totalValue   = etfValue + pacValue
  const totalCost    = etfCost  + pacInvested
  const totalGross   = etfGross + pacGross
  const totalTax     = etfTax   + pacTax
  const totalNet     = etfNet   + pacNet
  const grossPct     = totalCost > 0 ? (totalGross / totalCost) * 100 : 0
  const netPct       = totalCost > 0 ? (totalNet   / totalCost) * 100 : 0

  // ── PAC plan helpers ────────────────────────────────────────────────────────
  const totalMonthly = state.pacPlans.filter((p) => p.active).reduce((s, p) => s + p.monthlyAmount, 0)
  const projection10y = futureValue(pacValue || pacInvested, state.settings.expectedReturn, 10, totalMonthly)

  const fetchPrice = async (plan: PACPlan) => {
    setLoadingPrices((p) => new Set([...p, plan.id]))
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(plan.symbol)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPrices((p) => ({ ...p, [plan.symbol]: data.price }))
      updatePACPlan(plan.id, { currentPrice: data.price })
      const sec = state.securities.find((s) => s.symbol === plan.symbol)
      if (sec) updateSecurityPrice(sec.id, data.price, data.change, data.changePercent)
    } catch { /* silent */ }
    finally {
      setLoadingPrices((p) => { const s = new Set(p); s.delete(plan.id); return s })
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openPlanModal = (plan?: PACPlan) => { setEditPlan(plan); setPlanModal(true) }

  return (
    <div className="space-y-6">

      {/* ── Combined summary ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Controvalore',
            value: fmt(totalValue),
            sub: `${etfs.length} ETF · ${state.pacPlans.length} PAC`,
            color: 'text-white',
          },
          {
            label: 'P&L Lordo (Performance)',
            value: fmt(totalGross),
            sub: formatPercent(grossPct),
            color: totalGross >= 0 ? 'text-accent' : 'text-red-400',
          },
          {
            label: 'Tasse Stimate',
            value: fmt(totalTax),
            sub: 'Solo su plusvalenze',
            color: 'text-amber-400',
          },
          {
            label: 'P&L Netto (Tasse+TER)',
            value: fmt(totalNet),
            sub: formatPercent(netPct),
            color: totalNet >= 0 ? 'text-accent' : 'text-red-400',
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── PAC projection strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Investimento Mensile PAC</p>
          <p className="text-2xl font-bold font-mono text-accent">{fmt(totalMonthly)}</p>
          <p className="text-xs text-slate-500 mt-1">{state.pacPlans.filter((p) => p.active).length} PAC attivi</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Proiezione 10 Anni</p>
          <p className="text-2xl font-bold font-mono text-blue-400">{fmt(projection10y)}</p>
          <p className="text-xs text-slate-500 mt-1">A {state.settings.expectedReturn}% annuo</p>
        </Card>
      </div>

      {/* ── PAC plans list ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Piani di Accumulo"
          action={<Button size="sm" onClick={() => openPlanModal()}><Plus size={13} /> Nuovo PAC</Button>}
        />
        <div className="divide-y divide-white/[0.04]">
          {state.pacPlans.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              Nessun PAC configurato. Crea il tuo primo piano di accumulo.
            </div>
          )}
          {state.pacPlans.map((plan) => {
            const currentPrice = prices[plan.symbol] ?? plan.currentPrice ?? state.securities.find((s) => s.symbol === plan.symbol)?.currentPrice
            const invested     = getPACTotalInvested(plan)
            const qty          = getPACTotalQuantity(plan)
            const currentValue = getPACCurrentValue(plan, currentPrice)
            const pnl          = currentValue - invested
            const pnlPct       = invested > 0 ? (pnl / invested) * 100 : 0
            const isExpanded   = expanded.has(plan.id)

            return (
              <div key={plan.id}>
                <div className="px-5 py-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{plan.symbol}</span>
                          <Badge variant={plan.active ? 'green' : 'gray'}>{plan.active ? 'Attivo' : 'Sospeso'}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{plan.name}</p>
                      </div>
                      <div className="hidden md:grid grid-cols-4 gap-6 flex-1">
                        <div>
                          <p className="text-xs text-slate-500">Mensile</p>
                          <p className="font-mono text-sm text-accent font-semibold">{fmt(plan.monthlyAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Investito</p>
                          <p className="font-mono text-sm text-white">{fmt(invested)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Valore att.</p>
                          <p className="font-mono text-sm text-white">{currentPrice ? fmt(currentValue) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">P&L</p>
                          {currentPrice ? (
                            <p className={`font-mono text-sm font-semibold ${pnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                              {fmt(pnl)} ({formatPercent(pnlPct)})
                            </p>
                          ) : <p className="text-slate-500 text-sm">—</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchPrice(plan)}
                        disabled={loadingPrices.has(plan.id)}
                        className="p-1.5 text-slate-500 hover:text-accent rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                        title="Aggiorna prezzo"
                      >
                        <RefreshCw size={13} className={loadingPrices.has(plan.id) ? 'animate-spin' : ''} />
                      </button>
                      <button onClick={() => setPurchaseModal({ planId: plan.id })} className="p-1.5 text-slate-500 hover:text-accent rounded-lg hover:bg-white/[0.06] transition-colors" title="Registra acquisto">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => openPlanModal(plan)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deletePACPlan(plan.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => toggleExpanded(plan.id)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 glass">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Storico acquisti ({plan.purchases.length})</p>
                      <p className="text-xs text-slate-500 font-mono">
                        Totale: {qty.toFixed(4)} quote · Media: {invested > 0 && qty > 0 ? fmt(invested / qty) : '—'}/quota
                      </p>
                    </div>
                    {plan.purchases.length === 0 ? (
                      <p className="text-xs text-slate-600 py-3">Nessun acquisto registrato. Clicca + per aggiungere.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {['Data', 'Prezzo', 'Qt.', 'Importo', 'Comm.', ''].map((h) => (
                              <th key={h} className="py-2 text-left text-slate-600 font-medium pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {[...plan.purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.03]">
                              <td className="py-2 pr-4 text-slate-400">{formatDate(p.date)}</td>
                              <td className="py-2 pr-4 font-mono text-slate-300">{fmt(p.price)}</td>
                              <td className="py-2 pr-4 font-mono text-slate-300">{p.quantity.toFixed(4)}</td>
                              <td className="py-2 pr-4 font-mono text-white">{fmt(p.amount)}</td>
                              <td className="py-2 pr-4 font-mono text-slate-500">{fmt(p.commission)}</td>
                              <td className="py-2">
                                <button onClick={() => deletePACPurchase(plan.id, p.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {plan.ter && (
                      <p className="text-xs text-slate-600 mt-2">TER: {plan.ter}%/anno · Costo annuo stimato: {fmt((currentValue || invested) * plan.ter / 100)}</p>
                    )}
                    {plan.notes && <p className="text-xs text-slate-600 mt-1">{plan.notes}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <PACPlanModal
        key={editPlan?.id ?? 'new-pac'}
        open={planModal}
        onClose={() => { setPlanModal(false); setEditPlan(undefined) }}
        onSave={(data) => { editPlan ? updatePACPlan(editPlan.id, data) : addPACPlan(data) }}
        initial={editPlan}
      />
      {purchaseModal && (
        <PurchaseModal
          key={purchaseModal.initial?.id ?? `new-purchase-${purchaseModal.planId}`}
          open={true}
          onClose={() => setPurchaseModal(null)}
          onSave={(p) => addPACPurchase(purchaseModal.planId, p)}
          initial={purchaseModal.initial}
        />
      )}
    </div>
  )
}