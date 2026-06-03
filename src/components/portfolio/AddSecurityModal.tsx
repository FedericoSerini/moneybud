import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Security, SecurityType } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (s: Omit<Security, 'id'>) => void
  initial?: Security
  defaultType?: SecurityType
}

const TYPE_OPTIONS: { value: SecurityType; label: string; hint: string }[] = [
  { value: 'stock',     label: 'Titolo',    hint: 'Azioni, indici' },
  { value: 'etf',       label: 'ETF',       hint: 'Fondi indicizzati' },
  { value: 'commodity', label: 'Commodity', hint: 'Oro, argento, petrolio' },
  { value: 'crypto',    label: 'Crypto',    hint: 'Bitcoin, Ethereum...' },
]

const TITLES: Record<SecurityType, { add: string; edit: string }> = {
  stock:     { add: 'Aggiungi Titolo',    edit: 'Modifica Titolo'    },
  etf:       { add: 'Aggiungi ETF',       edit: 'Modifica ETF'       },
  commodity: { add: 'Aggiungi Commodity', edit: 'Modifica Commodity' },
  crypto:    { add: 'Aggiungi Crypto',    edit: 'Modifica Crypto'    },
}

const SYMBOL_HINTS: Record<SecurityType, { placeholder: string; label: string }> = {
  stock:     { label: 'Simbolo (es. AAPL)',   placeholder: 'AAPL, MSFT, ENI.MI…'   },
  etf:       { label: 'Simbolo (es. SWDA.L)', placeholder: 'SWDA.L, IWDA.AS…'      },
  commodity: { label: 'Simbolo (es. GC=F)',   placeholder: 'GC=F, SI=F, CL=F…'     },
  crypto:    { label: 'Simbolo (es. BTC-USD)',placeholder: 'BTC-USD, ETH-USD…'      },
}

const NAME_HINTS: Record<SecurityType, string> = {
  stock:     'Apple Inc.',
  etf:       'iShares MSCI World',
  commodity: 'Oro (XAU/USD)',
  crypto:    'Bitcoin',
}

const TAX_NOTES: Record<SecurityType, string> = {
  stock:     '26% per azioni in Italia. Per titoli di Stato usa la sezione Obbligazioni (12.5%).',
  etf:       '26% per ETF armonizzati in Italia. TER: costo annuo del fondo (già incluso nel NAV, utile per la pianificazione).',
  commodity: '26% per ETC/commodity in Italia.',
  crypto:    '26% per crypto in Italia (regime dichiarativo o amministrato).',
}

export function AddSecurityModal({ open, onClose, onSave, initial, defaultType = 'stock' }: Props) {
  const [form, setForm] = useState({
    type: (initial?.type ?? defaultType) as SecurityType,
    symbol: initial?.symbol ?? '',
    name: initial?.name ?? '',
    quantity: initial?.quantity?.toString() ?? '',
    purchasePrice: initial?.purchasePrice?.toString() ?? '',
    purchaseDate: initial?.purchaseDate ?? new Date().toISOString().split('T')[0],
    ter: initial?.ter?.toString() ?? '',
    taxRate: (initial?.taxRate ?? 26).toString(),
    commissions: (initial?.commissions ?? 0).toString(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.symbol.trim()) e.symbol = 'Simbolo richiesto'
    if (!form.name.trim()) e.name = 'Nome richiesto'
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) e.quantity = 'Numero valido richiesto'
    if (!form.purchasePrice || isNaN(Number(form.purchasePrice)) || Number(form.purchasePrice) <= 0) e.purchasePrice = 'Prezzo valido richiesto'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      type: form.type,
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name.trim(),
      quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
      purchaseDate: form.purchaseDate,
      ter: form.ter ? Number(form.ter) : undefined,
      taxRate: Number(form.taxRate) || 26,
      commissions: Number(form.commissions) || 0,
      currentPrice: initial?.currentPrice,
      currentChange: initial?.currentChange,
      currentChangePercent: initial?.currentChangePercent,
      lastUpdated: initial?.lastUpdated,
    })
    onClose()
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const titleInfo = TITLES[form.type]
  const showTer = form.type === 'etf' || !!initial?.ter

  return (
    <Modal open={open} onClose={onClose} title={initial ? titleInfo.edit : titleInfo.add} size="lg">
      <div className="space-y-4">

        {/* Type selector — only shown when adding new */}
        {!initial && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Tipo strumento</p>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: opt.value }))}
                  className={`px-3 py-2 rounded-lg text-center transition-colors border ${
                    form.type === opt.value
                      ? 'bg-accent/20 border-accent text-white'
                      : 'border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={SYMBOL_HINTS[form.type].label}
            placeholder={SYMBOL_HINTS[form.type].placeholder}
            value={form.symbol}
            onChange={(e) => set('symbol', e.target.value)}
            error={errors.symbol}
          />
          <Input
            label="Nome"
            placeholder={NAME_HINTS[form.type]}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantità" type="number" step="0.001" placeholder="10" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} error={errors.quantity} />
          <Input label="Prezzo acquisto" type="number" step="0.01" prefix="€" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} error={errors.purchasePrice} />
        </div>

        <Input label="Data acquisto" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />

        <div className="h-px bg-white/[0.06]" />
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Costi e fiscalità</p>

        <div className={`grid gap-4 ${showTer ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {showTer && (
            <Input
              label="TER annuo (%)"
              type="number" step="0.01" min="0" max="5"
              placeholder="0.20"
              suffix="%"
              value={form.ter}
              onChange={(e) => set('ter', e.target.value)}
            />
          )}
          <Input
            label="Aliquota capital gain"
            type="number" step="1" min="0" max="100"
            suffix="%"
            value={form.taxRate}
            onChange={(e) => set('taxRate', e.target.value)}
          />
          <Input
            label="Commissioni totali"
            type="number" step="0.01" min="0"
            prefix="€"
            placeholder="0.00"
            value={form.commissions}
            onChange={(e) => set('commissions', e.target.value)}
          />
        </div>

        <div className="bg-white/[0.06] rounded-lg p-3 text-xs text-slate-400">
          <p><strong className="text-slate-300">Aliquota:</strong> {TAX_NOTES[form.type]}</p>
          {form.type === 'etf' && (
            <p className="mt-1"><strong className="text-slate-300">Simboli:</strong> LSE: SWDA.L · Amsterdam: IWDA.AS · Borsa Italiana: SWDA.MI</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}
