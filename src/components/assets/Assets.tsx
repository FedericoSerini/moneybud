import { useState } from 'react'
import { Plus, Pencil, Trash2, Home, Car, Banknote, Package, TrendingDown, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getTotalAssetValue, getTotalAnnualAssetIncome, getVehicleDepreciatedValue,
  getEmergencyFundMonthlyBase, getEmergencyFundCoverageMonths,
} from '../../utils/calculations'
import { formatCurrency, formatDate } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Select, Textarea } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Asset, AssetType } from '../../types'

const ASSET_TYPES: { value: AssetType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'immobile',       label: 'Immobile',          icon: Home,        color: '#f97316' },
  { value: 'veicolo',        label: 'Veicolo',           icon: Car,         color: '#3b82f6' },
  { value: 'liquidita',      label: 'Liquidità',         icon: Banknote,    color: '#10b981' },
  { value: 'fondo_emergenza',label: 'Fondo Emergenza',   icon: ShieldCheck, color: '#6366f1' },
  { value: 'altro',          label: 'Altro',             icon: Package,     color: '#8b5cf6' },
]

const DEFAULT_DEPRECIATION = 15

// ─── Modal ────────────────────────────────────────────────────────────────────

function AssetModal({ open, onClose, onSave, initial }: {
  open: boolean
  onClose: () => void
  onSave: (a: Omit<Asset, 'id'>) => void
  initial?: Asset
}) {
  const [form, setForm] = useState({
    name:             initial?.name              ?? '',
    type:             initial?.type              ?? ('altro' as AssetType),
    value:            initial?.value?.toString() ?? '',
    yearlyIncome:     initial?.yearlyIncome?.toString() ?? '',
    purchaseDate:     initial?.purchaseDate      ?? '',
    notes:            initial?.notes             ?? '',
    depreciationRate: initial?.depreciationRate?.toString() ?? String(DEFAULT_DEPRECIATION),
    sqm:              initial?.sqm?.toString()   ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sqmMode, setSqmMode] = useState(initial?.type === 'immobile' && !!initial?.sqm)
  const [pricePerSqm, setPricePerSqm] = useState(
    initial?.sqm && initial?.value ? Math.round(initial.value / initial.sqm).toString() : ''
  )

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const updateFromSqm = (sqm: string, ppSqm: string) => {
    const s = Number(sqm)
    const p = Number(ppSqm)
    if (s > 0 && p > 0) set('value', Math.round(s * p).toString())
  }

  const handleSqm = (v: string) => { set('sqm', v); updateFromSqm(v, pricePerSqm) }
  const handlePricePerSqm = (v: string) => { setPricePerSqm(v); updateFromSqm(form.sqm, v) }

  const handleTypeChange = (v: string) => {
    set('type', v)
    if (v !== 'immobile') setSqmMode(false)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome richiesto'
    if (sqmMode && form.type === 'immobile') {
      if (!form.sqm || Number(form.sqm) <= 0) e.sqm = 'Metratura richiesta'
      if (!pricePerSqm || Number(pricePerSqm) <= 0) e.pricePerSqm = 'Prezzo/m² richiesto'
      if (Number(form.value) <= 0) e.value = 'Inserisci metratura e prezzo/m²'
    } else {
      if (!form.value || isNaN(Number(form.value)) || Number(form.value) < 0) e.value = 'Valore non valido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      name:             form.name.trim(),
      type:             form.type as AssetType,
      value:            Number(form.value),
      yearlyIncome:     form.yearlyIncome ? Number(form.yearlyIncome) : undefined,
      purchaseDate:     form.purchaseDate  || undefined,
      notes:            form.notes         || undefined,
      sqm:              sqmMode && form.sqm ? Number(form.sqm) : undefined,
      depreciationRate: form.type === 'veicolo' && form.depreciationRate
        ? Number(form.depreciationRate) : undefined,
    })
    onClose()
  }

  const computedSqmValue = sqmMode && form.sqm && pricePerSqm
    ? Number(form.sqm) * Number(pricePerSqm) : 0

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Asset' : 'Aggiungi Asset'}>
      <div className="space-y-4">
        <Input
          label="Nome"
          placeholder="Appartamento Milano, Tesla Model 3…"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo" value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          {/* Value: computed when sqm mode is active */}
          {form.type === 'immobile' && sqmMode ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-slate-400 font-medium">Valore calcolato</p>
              <div className="h-10 flex items-center px-3 bg-white/[0.06] rounded-xl border border-white/[0.08]">
                <span className="font-mono text-sm text-white">
                  {computedSqmValue > 0 ? formatCurrency(computedSqmValue) : '—'}
                </span>
              </div>
              {errors.value && <p className="text-xs text-red-400">{errors.value}</p>}
            </div>
          ) : (
            <Input
              label="Valore attuale"
              type="number" prefix="€"
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              error={errors.value}
            />
          )}
        </div>

        {/* Immobile: sqm toggle */}
        {form.type === 'immobile' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSqmMode(false)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${!sqmMode ? 'border-accent text-accent bg-accent/10' : 'border-white/[0.08] text-slate-500 hover:border-slate-500'}`}
              >
                Valore diretto
              </button>
              <button
                type="button"
                onClick={() => setSqmMode(true)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${sqmMode ? 'border-accent text-accent bg-accent/10' : 'border-white/[0.08] text-slate-500 hover:border-slate-500'}`}
              >
                Calcola da m²
              </button>
            </div>
            {sqmMode && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Metratura"
                  type="number" suffix="m²"
                  value={form.sqm}
                  onChange={(e) => handleSqm(e.target.value)}
                  error={errors.sqm}
                />
                <Input
                  label="Prezzo per m²"
                  type="number" prefix="€"
                  value={pricePerSqm}
                  onChange={(e) => handlePricePerSqm(e.target.value)}
                  error={errors.pricePerSqm}
                />
              </div>
            )}
          </div>
        )}

        {/* Veicolo: depreciation rate */}
        {form.type === 'veicolo' && (
          <Input
            label="Tasso svalutazione annuo"
            type="number"
            step="0.5"
            suffix="%"
            placeholder={String(DEFAULT_DEPRECIATION)}
            value={form.depreciationRate}
            onChange={(e) => set('depreciationRate', e.target.value)}
          />
        )}

        <div className={`grid gap-4 ${form.type !== 'fondo_emergenza' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {form.type !== 'fondo_emergenza' && (
            <Input
              label="Rendita annua (opzionale)"
              type="number" prefix="€"
              placeholder="Es. affitto annuo"
              value={form.yearlyIncome}
              onChange={(e) => set('yearlyIncome', e.target.value)}
            />
          )}
          <Input
            label="Data acquisto (opzionale)"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set('purchaseDate', e.target.value)}
          />
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Assets() {
  const { state, addAsset, updateAsset, deleteAsset } = useApp()
  const { fmt } = usePrivacy()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Asset | undefined>()

  const totalValue        = getTotalAssetValue(state.assets)
  const totalAnnualIncome = getTotalAnnualAssetIncome(state.assets)
  const efBase            = getEmergencyFundMonthlyBase(state.fixedExpenses, state.variableExpenses)
  const efMonths          = getEmergencyFundCoverageMonths(state.assets, state.fixedExpenses, state.variableExpenses)

  const handleSave = (data: Omit<Asset, 'id'>) => {
    if (editTarget) updateAsset(editTarget.id, data)
    else addAsset(data)
    setEditTarget(undefined)
    setModalOpen(false)
  }

  const openModal = (asset?: Asset) => { setEditTarget(asset); setModalOpen(true) }

  const byType = ASSET_TYPES.map((t) => ({
    ...t,
    items: state.assets.filter((a) => a.type === t.value),
    total: state.assets.filter((a) => a.type === t.value).reduce((s, a) => s + a.value, 0),
  }))

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Valore Totale Asset</p>
          <p className="text-2xl font-bold font-mono text-white">{fmt(totalValue)}</p>
          <p className="text-xs text-slate-500 mt-1">{state.assets.length} asset configurati</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Rendita Annua</p>
          <p className="text-2xl font-bold font-mono text-accent">{fmt(totalAnnualIncome)}</p>
          <p className="text-xs text-slate-500 mt-1">Da affitti e investimenti</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Rendita Mensile</p>
          <p className="text-2xl font-bold font-mono text-accent">{fmt(totalAnnualIncome / 12)}</p>
          <p className="text-xs text-slate-500 mt-1">Media mensile</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Yield</p>
          <p className="text-2xl font-bold font-mono text-blue-400">
            {totalValue > 0 ? `${((totalAnnualIncome / totalValue) * 100).toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Rendimento annuo</p>
        </Card>
      </div>

      {/* Asset list */}
      <Card>
        <CardHeader
          title="I tuoi Asset"
          action={
            <Button size="sm" onClick={() => openModal()}>
              <Plus size={13} /> Aggiungi
            </Button>
          }
        />
        <div className="divide-y divide-white/[0.04]">
          {state.assets.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              Nessun asset configurato. Aggiungi casa, auto, liquidità e altri beni.
            </div>
          )}
          {byType.map(({ value: type, label, icon: Icon, color, items }) => {
            if (items.length === 0) return null
            return (
              <div key={type} className={`px-5 py-4 rounded-xl ${type === 'liquidita' ? 'glass-emerald' : type === 'veicolo' ? 'glass-gold' : 'glass'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg" style={{ background: color + '20' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  <span className="text-xs text-slate-600 ml-auto font-mono">
                    {fmt(items.reduce((s, a) => s + a.value, 0))}
                  </span>
                </div>

                {/* Emergency fund coverage bar */}
                {type === 'fondo_emergenza' && (
                  <div className={`mb-3 ml-7 p-3 rounded-xl border ${efMonths >= 6 ? 'glass-emerald' : efMonths >= 3 ? 'glass-gold' : 'glass-danger'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">
                        {efMonths.toFixed(1)} mesi di copertura
                        {efBase > 0 && <span className="text-slate-600"> · base €{Math.round(efBase).toLocaleString('it-IT')}/mese</span>}
                      </span>
                      {efMonths >= 12
                        ? <Badge variant="green">PERFETTO</Badge>
                        : efMonths >= 6
                        ? <Badge variant="yellow">Ottimo</Badge>
                        : efMonths >= 3
                        ? <Badge variant="yellow">Parziale</Badge>
                        : <Badge variant="red">Insufficiente</Badge>}
                    </div>
                    {/* progress bar: full at 12 months */}
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (efMonths / 12) * 100)}%`,
                          background: efMonths >= 12 ? '#10b981' : efMonths >= 6 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    {efBase > 0 && (
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>6 mesi (ottimo): {fmt(efBase * 6)}</span>
                        <span>12 mesi (perfetto): {fmt(efBase * 12)}</span>
                      </div>
                    )}
                    {efBase === 0 && (
                      <p className="text-xs text-slate-600">Aggiungi spese fisse e traccia gli alimentari per calcolare l'obiettivo.</p>
                    )}
                  </div>
                )}

                <div className="space-y-2 ml-7">
                  {items.map((asset) => {
                    const deprRate = asset.depreciationRate ?? DEFAULT_DEPRECIATION
                    return (
                      <div
                        key={asset.id}
                        className="flex items-start justify-between p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-sm">{asset.name}</span>
                            {asset.yearlyIncome && asset.yearlyIncome > 0 && (
                              <Badge variant="green">+{fmt(asset.yearlyIncome)}/anno</Badge>
                            )}
                            {asset.sqm && (
                              <Badge variant="blue">{asset.sqm} m²</Badge>
                            )}
                          </div>
                          {asset.purchaseDate && (
                            <p className="text-xs text-slate-500 mt-0.5">Acquistato: {formatDate(asset.purchaseDate)}</p>
                          )}
                          {asset.sqm && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatCurrency(asset.value / asset.sqm)}/m²
                            </p>
                          )}
                          {asset.type === 'veicolo' && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <TrendingDown size={11} className="text-red-400 shrink-0" />
                              <span className="text-slate-500">{deprRate}%/anno →</span>
                              <span className="text-slate-400">1a: {fmt(getVehicleDepreciatedValue(asset.value, deprRate, 1))}</span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400">3a: {fmt(getVehicleDepreciatedValue(asset.value, deprRate, 3))}</span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400">5a: {fmt(getVehicleDepreciatedValue(asset.value, deprRate, 5))}</span>
                            </div>
                          )}
                          {asset.notes && <p className="text-xs text-slate-600 mt-0.5">{asset.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3 ml-3 mt-0.5">
                          <span className="font-mono font-semibold text-white text-sm whitespace-nowrap">{fmt(asset.value)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal(asset)}
                              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteAsset(asset.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Distribution */}
      {state.assets.length > 0 && (
        <Card>
          <CardHeader title="Distribuzione per Tipo" />
          <div className="px-5 pb-5 grid grid-cols-5 gap-4">
            {byType.map(({ value: type, label, icon: Icon, color, total }) => {
              const pct = totalValue > 0 ? (total / totalValue) * 100 : 0
              return (
                <div key={type} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: color + '20' }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-lg font-bold font-mono text-white">{pct.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 font-mono">{fmt(total)}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* key prop ensures the form inside AssetModal always resets when the target changes */}
      <AssetModal
        key={editTarget?.id ?? 'new-asset'}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(undefined) }}
        onSave={handleSave}
        initial={editTarget}
      />
    </div>
  )
}
