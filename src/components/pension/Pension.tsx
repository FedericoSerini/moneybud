import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { PiggyBank, TrendingUp, Calendar, Edit2, Plus, Trash2, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPensionProjection, futureValue, getTotalPensionValue, getTotalMonthlyPensionContrib,
  getEffectivePensionContrib, getPotentialMonthlyIncome, getMonthlyVoluntaryRate,
} from '../../utils/calculations'
import { formatCurrency, formatDate } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { PensionConfig, VoluntaryPayment } from '../../types'

// ─── Voluntary payment modal ──────────────────────────────────────────────────

function VoluntaryPaymentModal({ open, onClose, onSave, pensionProvider }: {
  open: boolean; onClose: () => void
  onSave: (p: Omit<VoluntaryPayment, 'id'>) => void
  pensionProvider: string
}) {
  const [form, setForm] = useState({
    date:   new Date().toISOString().split('T')[0],
    amount: '',
    notes:  '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Importo non valido'
    if (!form.date) e.date = 'Data richiesta'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({ date: form.date, amount: Number(form.amount), notes: form.notes || undefined })
    setForm({ date: new Date().toISOString().split('T')[0], amount: '', notes: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Versamento — ${pensionProvider}`} size="sm">
      <div className="space-y-4">
        <Input label="Data versamento" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
        <Input label="Importo" type="number" prefix="€" step="1" placeholder="Es. 500" value={form.amount} onChange={(e) => set('amount', e.target.value)} error={errors.amount} />
        <Input label="Note (opzionale)" placeholder="Es. Versamento straordinario" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>Registra</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Form modal ───────────────────────────────────────────────────────────────

function PensionFormModal({ open, onClose, onSave, initial, effectiveMonthlyIncome }: {
  open: boolean; onClose: () => void
  onSave: (p: Omit<PensionConfig, 'id'>) => void
  initial?: PensionConfig | null
  effectiveMonthlyIncome: number
}) {
  const [contribType, setContribType] = useState<'fixed' | 'percent'>(
    initial?.contributionType ?? 'fixed'
  )
  const [form, setForm] = useState({
    provider:               initial?.provider                           ?? '',
    currentValue:           initial?.currentValue?.toString()           ?? '0',
    monthlyContribution:    initial?.monthlyContribution?.toString()    ?? '0',
    contributionPercent:    initial?.contributionPercent?.toString()    ?? '',
    employerContribution:   initial?.employerContribution?.toString()   ?? '0',
    currentAge:             initial?.currentAge?.toString()             ?? '30',
    retirementAge:          initial?.retirementAge?.toString()          ?? '67',
    expectedReturn:         initial?.expectedReturn?.toString()         ?? '4',
    notes:                  initial?.notes                              ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const computedPercent = contribType === 'percent' && form.contributionPercent
    ? (effectiveMonthlyIncome * Number(form.contributionPercent)) / 100 : 0

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.provider.trim()) e.provider = 'Inserisci il provider'
    if (Number(form.currentAge) < 18 || Number(form.currentAge) > 80) e.currentAge = 'Età non valida'
    if (Number(form.retirementAge) <= Number(form.currentAge)) e.retirementAge = 'Deve essere maggiore dell\'età attuale'
    if (contribType === 'percent' && (!form.contributionPercent || Number(form.contributionPercent) <= 0))
      e.contributionPercent = 'Inserisci la percentuale'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      provider:              form.provider.trim(),
      currentValue:          Number(form.currentValue),
      monthlyContribution:   contribType === 'fixed' ? Number(form.monthlyContribution) : 0,
      contributionType:      contribType,
      contributionPercent:   contribType === 'percent' ? Number(form.contributionPercent) : undefined,
      employerContribution:  Number(form.employerContribution),
      currentAge:            Number(form.currentAge),
      retirementAge:         Number(form.retirementAge),
      expectedReturn:        Number(form.expectedReturn),
      notes:                 form.notes || undefined,
      voluntaryPayments:     initial?.voluntaryPayments ?? [],
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Fondo Pensione' : 'Aggiungi Fondo Pensione'} size="lg">
      <div className="space-y-4">
        <Input label="Provider / Nome Fondo" placeholder="Allianz, Generali, INPS…" value={form.provider} onChange={(e) => set('provider', e.target.value)} error={errors.provider} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Valore attuale" type="number" prefix="€" value={form.currentValue} onChange={(e) => set('currentValue', e.target.value)} />
          <Input label="Contributo datore" type="number" prefix="€" value={form.employerContribution} onChange={(e) => set('employerContribution', e.target.value)} />
        </div>

        {/* Contribution type toggle */}
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">Tuo contributo mensile</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContribType('fixed')}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${contribType === 'fixed' ? 'border-accent text-accent bg-accent/10' : 'border-white/[0.08] text-slate-500 hover:border-slate-500'}`}
            >
              Importo fisso
            </button>
            <button
              type="button"
              onClick={() => setContribType('percent')}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${contribType === 'percent' ? 'border-accent text-accent bg-accent/10' : 'border-white/[0.08] text-slate-500 hover:border-slate-500'}`}
            >
              % dello stipendio
            </button>
          </div>

          {contribType === 'fixed' ? (
            <Input
              label="Importo mensile"
              type="number" prefix="€"
              value={form.monthlyContribution}
              onChange={(e) => set('monthlyContribution', e.target.value)}
            />
          ) : (
            <div className="space-y-2">
              <Input
                label="Percentuale del reddito effettivo"
                type="number" step="0.1" suffix="%"
                placeholder="Es. 5"
                value={form.contributionPercent}
                onChange={(e) => set('contributionPercent', e.target.value)}
                error={errors.contributionPercent}
              />
              {effectiveMonthlyIncome > 0 && form.contributionPercent && (
                <p className="text-xs text-slate-400">
                  = <span className="text-accent font-mono font-semibold">{formatCurrency(computedPercent)}/mese</span>
                  {' '}su {formatCurrency(effectiveMonthlyIncome)} reddito effettivo
                </p>
              )}
              {effectiveMonthlyIncome === 0 && (
                <p className="text-xs text-gold">Imposta il reddito mensile nelle Impostazioni per calcolare l'importo</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Età attuale" type="number" min={18} max={80} value={form.currentAge} onChange={(e) => set('currentAge', e.target.value)} error={errors.currentAge} />
          <Input label="Età pensione" type="number" min={50} max={80} value={form.retirementAge} onChange={(e) => set('retirementAge', e.target.value)} error={errors.retirementAge} />
          <Input label="Rendimento atteso" type="number" step="0.1" suffix="%" value={form.expectedReturn} onChange={(e) => set('expectedReturn', e.target.value)} />
        </div>
        <Textarea label="Note (opzionale)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Single pension card ──────────────────────────────────────────────────────

function PensionCard({ pension, onEdit, onDelete, onAddPayment, effectiveMonthlyIncome }: {
  pension: PensionConfig
  onEdit: () => void
  onDelete: () => void
  onAddPayment: () => void
  effectiveMonthlyIncome: number
}) {
  const [expanded, setExpanded] = useState(false)
  const { fmt } = usePrivacy()
  const { deleteVoluntaryPensionPayment } = useApp()
  const { yearsToRetirement, projectedValue, totalContributions, totalGrowth } =
    getPensionProjection(pension, effectiveMonthlyIncome)
  const retirementYear = new Date().getFullYear() + yearsToRetirement
  const monthlyOwn = getEffectivePensionContrib(pension, effectiveMonthlyIncome)
  const monthlyTotal = monthlyOwn + pension.employerContribution

  const projectionData = Array.from({ length: yearsToRetirement + 1 }, (_, i) => ({
    year: (new Date().getFullYear() + i).toString(),
    value: Math.round(futureValue(pension.currentValue, pension.expectedReturn, i, monthlyTotal)),
  }))

  const voluntaryPayments = pension.voluntaryPayments ?? []
  const monthlyVolRate = getMonthlyVoluntaryRate(voluntaryPayments)
  const totalVoluntary = voluntaryPayments.reduce((s, p) => s + p.amount, 0)

  const contribSub = pension.contributionType === 'percent' && pension.contributionPercent != null
    ? `${pension.contributionPercent}% stipendio${monthlyVolRate > 0 ? ` + vol.` : ''} · Datore: ${formatCurrency(pension.employerContribution)}`
    : `Tu: ${formatCurrency(monthlyOwn - monthlyVolRate)}${monthlyVolRate > 0 ? ` + ${formatCurrency(monthlyVolRate)} vol.` : ''} · Datore: ${formatCurrency(pension.employerContribution)}`

  const sortedPayments = [...voluntaryPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <Card>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <PiggyBank size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-semibold text-white">{pension.provider}</p>
            <p className="text-xs text-slate-500">
              {yearsToRetirement} anni alla pensione · {pension.expectedReturn}% rendimento atteso
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">{pension.retirementAge} anni</Badge>
          {pension.contributionType === 'percent' && (
            <Badge variant="yellow">{pension.contributionPercent}% stipendio</Badge>
          )}
          <button
            onClick={onAddPayment}
            className="p-1.5 text-slate-500 hover:text-accent rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Aggiungi versamento volontario"
          >
            <CreditCard size={14} />
          </button>
          <button onClick={onEdit} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"><Trash2 size={14} /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-0 border-t border-white/[0.06]">
        {[
          { label: 'Valore Attuale',   value: fmt(pension.currentValue),        color: 'text-white' },
          { label: 'Contributo/mese',  value: fmt(monthlyTotal),                sub: contribSub, color: 'text-blue-400' },
          { label: 'Valore Stimato',   value: fmt(projectedValue),              sub: `Anno ${retirementYear}`, color: 'text-accent' },
          { label: 'Rendita Mensile',  value: fmt(projectedValue / (25 * 12)),  sub: 'SWR 4%/anno', color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className={`px-4 py-4 ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`font-mono font-bold ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-[11px] text-slate-600 mt-0.5 truncate">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Expanded: projection chart + voluntary payment history */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/[0.06]">
          <p className="text-xs text-slate-500 mt-4 mb-3">Proiezione anno per anno</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id={`grad-${pension.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Valore stimato']}
                labelFormatter={(l) => `Anno ${l}`}
                contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
              />
              <ReferenceLine
                x={retirementYear.toString()}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Pensione', position: 'top', fill: '#f59e0b', fontSize: 11 }}
              />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill={`url(#grad-${pension.id})`} />
            </AreaChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Capitale investito', value: fmt(totalContributions) },
              { label: 'Crescita stimata',   value: fmt(totalGrowth),       color: 'text-accent' },
              { label: 'Moltiplicatore',     value: pension.currentValue > 0 ? `${(projectedValue / pension.currentValue).toFixed(1)}x` : '—', color: 'text-blue-400' },
            ].map((r) => (
              <div key={r.label} className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{r.label}</p>
                <p className={`font-mono font-bold ${r.color ?? 'text-white'}`}>{r.value}</p>
              </div>
            ))}
          </div>

          {/* Voluntary payment history */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Versamenti Volontari</p>
              {totalVoluntary > 0 && (
                <span className="text-xs text-slate-500 font-mono">Totale: {fmt(totalVoluntary)}</span>
              )}
            </div>
            {sortedPayments.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl text-slate-500 text-xs">
                <CreditCard size={13} />
                Nessun versamento registrato. Usa il pulsante <CreditCard size={11} className="inline mx-0.5" /> per aggiungerne uno.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Data', 'Importo', 'Note', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {sortedPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/[0.06] transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-mono">{formatDate(payment.date)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-accent">{fmt(payment.amount)}</td>
                        <td className="px-3 py-2 text-slate-500">{payment.notes ?? '—'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => deleteVoluntaryPensionPayment(pension.id, payment.id)}
                            className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pension.notes && <p className="text-xs text-slate-500 mt-3">{pension.notes}</p>}
        </div>
      )}
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Pension() {
  const { state, addPension, updatePension, deletePension, addVoluntaryPensionPayment } = useApp()
  const { fmt } = usePrivacy()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PensionConfig | undefined>()
  const [paymentTarget, setPaymentTarget] = useState<PensionConfig | undefined>()

  const effectiveMonthlyIncome = getPotentialMonthlyIncome(state.settings)
  const totalPensionValue   = getTotalPensionValue(state.pensions)
  const totalMonthlyContrib = getTotalMonthlyPensionContrib(state.pensions, effectiveMonthlyIncome)
  const totalProjected      = state.pensions.reduce((sum, p) => sum + getPensionProjection(p, effectiveMonthlyIncome).projectedValue, 0)

  const openModal = (pension?: PensionConfig) => { setEditTarget(pension); setModalOpen(true) }

  const handleSave = (data: Omit<PensionConfig, 'id'>) => {
    if (editTarget) updatePension(editTarget.id, data)
    else addPension(data)
    setEditTarget(undefined)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Global summary (only if >1 fund) */}
      {state.pensions.length > 1 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Totale Fondi Pensione</p>
            <p className="text-2xl font-bold font-mono text-white">{fmt(totalPensionValue)}</p>
            <p className="text-xs text-slate-500 mt-1">{state.pensions.length} fondi</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Contributo Mensile Totale</p>
            <p className="text-2xl font-bold font-mono text-blue-400">{fmt(totalMonthlyContrib)}</p>
            <p className="text-xs text-slate-500 mt-1">Somma di tutti i fondi</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Valore Stimato Totale</p>
            <p className="text-2xl font-bold font-mono text-accent">{fmt(totalProjected)}</p>
            <p className="text-xs text-slate-500 mt-1">Alla rispettiva età pensione</p>
          </Card>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => openModal()}>
          <Plus size={15} /> Aggiungi Fondo Pensione
        </Button>
      </div>

      {/* Empty state */}
      {state.pensions.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
          <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center">
            <PiggyBank size={36} className="text-accent" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Nessun fondo pensione configurato</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Aggiungi i tuoi fondi pensione (puoi averne più di uno) per visualizzare le proiezioni e il valore atteso alla pensione.
            </p>
          </div>
        </div>
      )}

      {/* Pension cards */}
      {state.pensions.map((pension) => (
        <PensionCard
          key={pension.id}
          pension={pension}
          onEdit={() => openModal(pension)}
          onDelete={() => deletePension(pension.id)}
          onAddPayment={() => setPaymentTarget(pension)}
          effectiveMonthlyIncome={effectiveMonthlyIncome}
        />
      ))}

      <PensionFormModal
        key={editTarget?.id ?? 'new-pension'}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined) }}
        onSave={handleSave}
        initial={editTarget}
        effectiveMonthlyIncome={effectiveMonthlyIncome}
      />

      {paymentTarget && (
        <VoluntaryPaymentModal
          key={paymentTarget.id}
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(undefined)}
          onSave={(payment) => addVoluntaryPensionPayment(paymentTarget.id, payment)}
          pensionProvider={paymentTarget.provider}
        />
      )}
    </div>
  )
}
