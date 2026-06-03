import { useState } from 'react'
import { Plus, Pencil, Trash2, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getBondValue, getBondCost, getBondAnnualCoupon, getBondGrossGain, getBondNetGain,
  getTotalBondValue, getTotalBondAnnualCoupon,
} from '../../utils/calculations'
import { formatCurrency, formatPercent, formatDate } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Bond } from '../../types'

// ─── Modal ────────────────────────────────────────────────────────────────────

function BondModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (b: Omit<Bond, 'id'>) => void
  initial?: Bond
}) {
  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    isin:          initial?.isin          ?? '',
    issuer:        initial?.issuer        ?? '',
    faceValue:     initial?.faceValue?.toString()     ?? '1000',
    quantity:      initial?.quantity?.toString()      ?? '',
    purchasePrice: initial?.purchasePrice?.toString() ?? '',
    currentPrice:  initial?.currentPrice?.toString()  ?? '',
    couponRate:    initial?.couponRate?.toString()    ?? '',
    maturityDate:  initial?.maturityDate  ?? '',
    purchaseDate:  initial?.purchaseDate  ?? new Date().toISOString().split('T')[0],
    taxRate:       (initial?.taxRate ?? 12.5).toString(),
    notes:         initial?.notes         ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())         e.name         = 'Nome richiesto'
    if (!form.issuer.trim())       e.issuer       = 'Emittente richiesto'
    if (!form.faceValue || Number(form.faceValue) <= 0) e.faceValue = 'Valore nominale non valido'
    if (!form.quantity   || Number(form.quantity)   <= 0) e.quantity   = 'Quantità non valida'
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) e.purchasePrice = 'Prezzo acquisto non valido'
    if (!form.couponRate || Number(form.couponRate) < 0) e.couponRate = 'Tasso cedolare non valido'
    if (!form.maturityDate) e.maturityDate = 'Data scadenza richiesta'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      name:          form.name.trim(),
      isin:          form.isin.trim() || undefined,
      issuer:        form.issuer.trim(),
      faceValue:     Number(form.faceValue),
      quantity:      Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
      currentPrice:  form.currentPrice ? Number(form.currentPrice) : undefined,
      couponRate:    Number(form.couponRate),
      maturityDate:  form.maturityDate,
      purchaseDate:  form.purchaseDate,
      taxRate:       Number(form.taxRate),
      notes:         form.notes.trim() || undefined,
    })
    onClose()
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Obbligazione' : 'Aggiungi Obbligazione'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome" placeholder="BTP 2030, Bond ENI…" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <Input label="ISIN (opzionale)" placeholder="IT0005…" value={form.isin} onChange={(e) => set('isin', e.target.value)} />
        </div>
        <Input label="Emittente" placeholder="Governo Italiano, ENI SpA…" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} error={errors.issuer} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Val. nominale unitario" type="number" prefix="€" value={form.faceValue} onChange={(e) => set('faceValue', e.target.value)} error={errors.faceValue} />
          <Input label="Quantità (titoli)" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} error={errors.quantity} />
          <Select label="Aliquota" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)}>
            <option value="12.5">12.5% — Titoli di Stato</option>
            <option value="26">26% — Corporate</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prezzo acquisto (%)" type="number" step="0.01" suffix="%" placeholder="98.50" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} error={errors.purchasePrice} />
          <Input label="Prezzo corrente (%, opz.)" type="number" step="0.01" suffix="%" placeholder="es. 101.20" value={form.currentPrice} onChange={(e) => set('currentPrice', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Tasso cedolare annuo" type="number" step="0.01" suffix="%" placeholder="3.75" value={form.couponRate} onChange={(e) => set('couponRate', e.target.value)} error={errors.couponRate} />
          <Input label="Data scadenza" type="date" value={form.maturityDate} onChange={(e) => set('maturityDate', e.target.value)} error={errors.maturityDate} />
        </div>
        <Input label="Data acquisto" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        <Input label="Note (opzionale)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Bonds() {
  const { state, addBond, updateBond, deleteBond } = useApp()
  const { privacyMode, fmt } = usePrivacy()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Bond | undefined>()

  const bonds = state.bonds
  const totalValue       = getTotalBondValue(bonds)
  const totalCost        = bonds.reduce((s, b) => s + getBondCost(b), 0)
  const totalGross       = bonds.reduce((s, b) => s + getBondGrossGain(b), 0)
  const totalNet         = bonds.reduce((s, b) => s + getBondNetGain(b), 0)
  const totalCoupon      = getTotalBondAnnualCoupon(bonds)
  const totalGrossPct    = totalCost > 0 ? (totalGross / totalCost) * 100 : 0
  const totalNetPct      = totalCost > 0 ? (totalNet   / totalCost) * 100 : 0

  const openModal = (bond?: Bond) => { setEditTarget(bond); setModalOpen(true) }

  const handleSave = (data: Omit<Bond, 'id'>) => {
    if (editTarget) updateBond(editTarget.id, data)
    else addBond(data)
    setEditTarget(undefined)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Controvalore',  value: fmt(totalValue),  sub: `${bonds.length} obbligazioni`, color: 'text-white' },
          { label: 'P&L Lordo',     value: fmt(totalGross),  sub: formatPercent(totalGrossPct),   color: totalGross >= 0 ? 'text-accent' : 'text-red-400' },
          { label: 'P&L Netto',     value: fmt(totalNet),    sub: formatPercent(totalNetPct),      color: totalNet   >= 0 ? 'text-accent' : 'text-red-400' },
          { label: 'Cedole Annue',  value: fmt(totalCoupon), sub: `${fmt(totalCoupon / 12)}/mese`, color: 'text-blue-400' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Aliquota info */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm">
        <Info size={15} className="shrink-0" />
        <span>
          I prezzi sono espressi in <strong className="text-white">% del valore nominale</strong>.
          Aliquota 12.5% per titoli di stato, 26% per corporate. Le cedole non includono la ritenuta fiscale.
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Obbligazioni"
          action={
            <Button size="sm" onClick={() => openModal()}>
              <Plus size={13} /> Aggiungi
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Nome / ISIN', 'Emittente', 'Nominale', 'Acq.%', 'Att.%', 'Cedola', 'Scadenza', 'Valore', 'P&L netto', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {bonds.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-sm">
                    Nessuna obbligazione. Aggiungi la prima posizione.
                  </td>
                </tr>
              )}
              {bonds.map((bond) => {
                const value     = getBondValue(bond)
                const coupon    = getBondAnnualCoupon(bond)
                const grossGain = getBondGrossGain(bond)
                const netGain   = getBondNetGain(bond)
                const cost      = getBondCost(bond)
                const netPct    = cost > 0 ? (netGain / cost) * 100 : 0
                const pnlColor  = netGain >= 0 ? 'text-accent' : 'text-red-400'
                const daysToMaturity = Math.ceil((new Date(bond.maturityDate).getTime() - Date.now()) / 86_400_000)
                const maturityBadge  = daysToMaturity < 0 ? 'red' : daysToMaturity < 365 ? 'yellow' : 'green'

                return (
                  <tr key={bond.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{bond.name}</p>
                      {bond.isin && <p className="text-xs text-slate-500 font-mono">{bond.isin}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{bond.issuer}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-sm">
                      {privacyMode ? '••••' : `${bond.quantity}×${formatCurrency(bond.faceValue)}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-sm">{bond.purchasePrice.toFixed(2)}%</td>
                    <td className="px-4 py-3 font-mono text-white text-sm">
                      {bond.currentPrice != null ? `${bond.currentPrice.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-400 text-sm">
                      {bond.couponRate.toFixed(2)}%
                      {!privacyMode && <div className="text-slate-600 text-[10px]">{formatCurrency(coupon)}/anno</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={maturityBadge}>{formatDate(bond.maturityDate)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-white text-sm">{fmt(value)}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${pnlColor}`}>
                      <div>{fmt(netGain)}</div>
                      <div className="opacity-70">{formatPercent(netPct)}</div>
                      <div className="text-slate-600">lordo {fmt(grossGain)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openModal(bond)}
                          className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteBond(bond.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {bonds.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td colSpan={7} className="px-4 py-3 text-sm text-slate-400">Totale portafoglio obbligazionario</td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{fmt(totalValue)}</td>
                  <td className={`px-4 py-3 font-mono font-bold text-sm ${totalNet >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    {fmt(totalNet)} ({formatPercent(totalNetPct)})
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <BondModal
        key={editTarget?.id ?? 'new-bond'}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined) }}
        onSave={handleSave}
        initial={editTarget}
      />
    </div>
  )
}
