import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Calendar, Clock, GripVertical, FileUp, ChevronDown, ChevronUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import {
  getTotalMonthlyFixed, getMonthlyVariableExpenses, getVariableExpensesByMonth,
  isFixedExpenseActive, getMonthlyVariableIncome, getVariableIncomeByMonth,
} from '../../utils/calculations'
import { formatCurrency, formatDate, currentMonthLabel } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { Badge } from '../ui/Badge'
import {
  FixedExpense, FixedExpenseCategory,
  VariableExpense, VariableExpenseCategory,
  VariableIncome, VariableIncomeCategory,
} from '../../types'
import { ExcelImportModal } from './ExcelImportModal'

// ─── Category maps ────────────────────────────────────────────────────────────

const FIXED_CATS: FixedExpenseCategory[] = [
  'affitto','mutuo','utenze','abbonamenti','assicurazioni','trasporti','istruzione','altro',
]
const VAR_EXP_CATS: VariableExpenseCategory[] = [
  'alimentari','ristoranti','abbigliamento','salute','intrattenimento','viaggi','trasporti','casa','tecnologia','utenze','banca','altro',
]
const VAR_INC_CATS: VariableIncomeCategory[] = [
  'freelance','bonus','dividendi','affitto','vendita','rimborso','regalo','altro',
]

const EXPENSE_COLORS: Record<string, string> = {
  alimentari:'#10b981', ristoranti:'#f59e0b', abbigliamento:'#8b5cf6', salute:'#ef4444',
  intrattenimento:'#3b82f6', viaggi:'#14b8a6', casa:'#f97316', tecnologia:'#ec4899', banca:'#0ea5e9', altro:'#64748b',
  affitto:'#f97316', mutuo:'#ef4444', utenze:'#3b82f6', abbonamenti:'#8b5cf6',
  assicurazioni:'#f59e0b', trasporti:'#14b8a6', istruzione:'#10b981',
}
const INCOME_COLORS: Record<string, string> = {
  freelance:'#10b981', bonus:'#f59e0b', dividendi:'#3b82f6', affitto:'#f97316',
  vendita:'#8b5cf6', rimborso:'#14b8a6', regalo:'#ec4899', altro:'#64748b',
}

// ─── Group items by month/year ────────────────────────────────────────────────

function groupByYearMonth<T extends { date: string }>(
  items: T[],
): { key: string; label: string; items: T[] }[] {
  const groups: Record<string, { label: string; items: T[] }> = {}
  for (const item of items) {
    const key = item.date.slice(0, 7) // "YYYY-MM"
    if (!groups[key]) {
      const d = new Date(item.date + 'T00:00:00')
      const raw = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(d)
      groups[key] = { label: raw.charAt(0).toUpperCase() + raw.slice(1), items: [] }
    }
    groups[key].items.push(item)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, v]) => ({ key, ...v }))
}

// ─── Drag-and-drop hook ───────────────────────────────────────────────────────

function useDragSort<T extends { id: string }>(
  items: T[],
  onReorder: (items: T[]) => void,
) {
  const dragIdx = useRef<number | null>(null)

  const onDragStart = (index: number) => { dragIdx.current = index }

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === index) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    onReorder(next)
    dragIdx.current = index
  }

  const onDragEnd = () => { dragIdx.current = null }

  return { onDragStart, onDragOver, onDragEnd }
}

// ─── Privacy chart placeholder ────────────────────────────────────────────────

const PrivacyChart = ({ height = 160 }: { height?: number }) => (
  <div
    style={{ height }}
    className="flex items-center justify-center bg-white/[0.03] rounded-lg border border-white/[0.06]"
  >
    <p className="text-slate-500 text-sm">Modalità privacy attiva</p>
  </div>
)

// ─── Fixed expense modal ──────────────────────────────────────────────────────

function FixedExpenseModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (e: Omit<FixedExpense, 'id'>) => void
  initial?: FixedExpense
}) {
  const [form, setForm] = useState({
    name:      initial?.name      ?? '',
    amount:    initial?.amount?.toString() ?? '',
    category:  (initial?.category ?? 'altro') as FixedExpenseCategory,
    startDate: initial?.startDate ?? new Date().toISOString().split('T')[0],
    endDate:   initial?.endDate   ?? '',
    notes:     initial?.notes     ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome richiesto'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Importo non valido'
    if (form.endDate && form.endDate < form.startDate) e.endDate = 'La data fine deve essere dopo quella di inizio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      name: form.name.trim(), amount: Number(form.amount), category: form.category,
      startDate: form.startDate, endDate: form.endDate || undefined, notes: form.notes || undefined,
    })
    onClose()
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Spesa Fissa' : 'Aggiungi Spesa Fissa'}>
      <div className="space-y-4">
        <Input label="Nome" placeholder="Affitto, Netflix…" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Importo mensile" type="number" prefix="€" value={form.amount} onChange={(e) => set('amount', e.target.value)} error={errors.amount} />
          <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {FIXED_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data inizio" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          <Input label="Data fine (opzionale)" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
        </div>
        {form.endDate && (
          <div className="glass-gold rounded-lg p-3 text-xs text-gold">
            La spesa sarà esclusa dai totali dopo il {formatDate(form.endDate)}.
          </div>
        )}
        <Input label="Note (opzionale)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Variable expense modal ───────────────────────────────────────────────────

function VariableExpenseModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (e: Omit<VariableExpense, 'id'>) => void
  initial?: VariableExpense
}) {
  const [form, setForm] = useState({
    description: initial?.description ?? '',
    amount:      initial?.amount?.toString() ?? '',
    category:    (initial?.category ?? 'altro') as VariableExpenseCategory,
    date:        initial?.date ?? new Date().toISOString().split('T')[0],
  })

  const handleSubmit = () => {
    if (!form.description || !form.amount) return
    onSave({ description: form.description, amount: Number(form.amount), category: form.category, date: form.date })
    onClose()
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Spesa' : 'Aggiungi Spesa Variabile'}>
      <div className="space-y-4">
        <Input label="Descrizione" placeholder="Supermercato, Cena fuori…" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Importo" type="number" prefix="€" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {VAR_EXP_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </Select>
        </div>
        <Input label="Data" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Variable income modal ────────────────────────────────────────────────────

function VariableIncomeModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void
  onSave: (i: Omit<VariableIncome, 'id'>) => void
  initial?: VariableIncome
}) {
  const [form, setForm] = useState({
    description: initial?.description ?? '',
    amount:      initial?.amount?.toString() ?? '',
    category:    (initial?.category ?? 'altro') as VariableIncomeCategory,
    date:        initial?.date ?? new Date().toISOString().split('T')[0],
  })

  const handleSubmit = () => {
    if (!form.description || !form.amount) return
    onSave({ description: form.description, amount: Number(form.amount), category: form.category, date: form.date })
    onClose()
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica Entrata' : 'Aggiungi Entrata Variabile'}>
      <div className="space-y-4">
        <Input label="Descrizione" placeholder="Freelance, Bonus, Dividendo…" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Importo" type="number" prefix="€" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {VAR_INC_CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </Select>
        </div>
        <Input label="Data" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Month-grouped variable expense list ──────────────────────────────────────

function VariableExpenseGroups({
  expenses, fmt, onEdit, onDelete,
}: {
  expenses: VariableExpense[]
  fmt: (n: number) => string
  onEdit: (e: VariableExpense) => void
  onDelete: (id: string) => void
}) {
  const groups = groupByYearMonth(expenses)
  const currentKey = new Date().toISOString().slice(0, 7)
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.slice(1).map((g) => g.key)), // collapse all except most recent
  )

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="divide-y divide-white/[0.04]">
      {groups.map((group) => {
        const open = !collapsed.has(group.key)
        const total = group.items.reduce((s, e) => s + e.amount, 0)
        const isCurrentMonth = group.key === currentKey
        return (
          <div key={group.key}>
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-2">
                {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                <span className="text-sm font-medium text-slate-200">{group.label}</span>
                {isCurrentMonth && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">Corrente</span>
                )}
                <span className="text-xs text-slate-500">{group.items.length} voci</span>
              </div>
              <span className="text-sm font-mono font-semibold text-white">{fmt(total)}</span>
            </button>
            {open && (
              <div className="border-t border-white/[0.06]">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-white/[0.04]">
                    {group.items.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/[0.06] transition-colors">
                        <td className="px-3 py-1.5 text-slate-400 text-xs whitespace-nowrap w-24">
                          <div className="flex items-center gap-1.5"><Calendar size={11} />{formatDate(exp.date)}</div>
                        </td>
                        <td className="px-1 py-0.5 text-white">{exp.description}</td>
                        <td className="px-1 py-0.5">
                          <Badge variant="gray"><span style={{ color: EXPENSE_COLORS[exp.category] }}>● </span>{exp.category}</Badge>
                        </td>
                        <td className="px-1 py-0.5 font-mono font-semibold text-white whitespace-nowrap">{fmt(exp.amount)}</td>
                        <td className="px-1 py-0.5">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => onEdit(exp)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"><Pencil size={12} /></button>
                            <button onClick={() => onDelete(exp.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Month-grouped variable income list ───────────────────────────────────────

function VariableIncomeGroups({
  incomes, fmt, onEdit, onDelete,
}: {
  incomes: VariableIncome[]
  fmt: (n: number) => string
  onEdit: (i: VariableIncome) => void
  onDelete: (id: string) => void
}) {
  const groups = groupByYearMonth(incomes)
  const currentKey = new Date().toISOString().slice(0, 7)
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.slice(1).map((g) => g.key)),
  )

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="divide-y divide-white/[0.04]">
      {groups.map((group) => {
        const open = !collapsed.has(group.key)
        const total = group.items.reduce((s, i) => s + i.amount, 0)
        const isCurrentMonth = group.key === currentKey
        return (
          <div key={group.key}>
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-2">
                {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                <span className="text-sm font-medium text-slate-200">{group.label}</span>
                {isCurrentMonth && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">Corrente</span>
                )}
                <span className="text-xs text-slate-500">{group.items.length} voci</span>
              </div>
              <span className="text-sm font-mono font-semibold text-accent">{fmt(total)}</span>
            </button>
            {open && (
              <div className="border-t border-white/[0.06]">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-white/[0.04]">
                    {group.items.map((inc) => (
                      <tr key={inc.id} className="hover:bg-white/[0.06] transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap w-24">
                          <div className="flex items-center gap-1.5"><Calendar size={11} />{formatDate(inc.date)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-white">{inc.description}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="green"><span style={{ color: INCOME_COLORS[inc.category] }}>● </span>{inc.category}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-accent whitespace-nowrap">{fmt(inc.amount)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => onEdit(inc)} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => onDelete(inc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'fixed' | 'variable' | 'incomes'

export function Expenses() {
  const {
    state,
    addFixedExpense, updateFixedExpense, deleteFixedExpense, reorderFixedExpenses,
    addVariableExpense, updateVariableExpense, deleteVariableExpense,
    addVariableIncome, updateVariableIncome, deleteVariableIncome,
  } = useApp()
  const { privacyMode, fmt } = usePrivacy()

  const [tab, setTab] = useState<Tab>('fixed')
  const [fixedModal, setFixedModal]   = useState(false)
  const [varModal, setVarModal]       = useState(false)
  const [incModal, setIncModal]       = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [editFixed, setEditFixed]     = useState<FixedExpense | undefined>()
  const [editVar, setEditVar]         = useState<VariableExpense | undefined>()
  const [editInc, setEditInc]         = useState<VariableIncome | undefined>()

  const existingExpenseHashes = new Set(
    state.variableExpenses.map((e) => e.importHash).filter(Boolean) as string[],
  )
  const existingIncomeHashes = new Set(
    state.variableIncomes.map((i) => i.importHash).filter(Boolean) as string[],
  )
  const existingHashes = new Set([...existingExpenseHashes, ...existingIncomeHashes])

  const handleExcelImport = (
    expenses: Array<{ date: string; description: string; amount: number; category: VariableExpenseCategory; importHash: string }>,
    incomes:  Array<{ date: string; description: string; amount: number; category: VariableIncomeCategory; importHash: string }>,
  ) => {
    expenses.forEach((e) => addVariableExpense(e))
    incomes.forEach((i)  => addVariableIncome(i))
  }

  // Drag-and-drop — hooks operate on the same arrays used for rendering
  const fixedDnd  = useDragSort(state.fixedExpenses,    reorderFixedExpenses)


  // Totals
  const totalFixed       = getTotalMonthlyFixed(state.fixedExpenses)
  const currentMonthVar  = getMonthlyVariableExpenses(state.variableExpenses)
  const currentMonthInc  = getMonthlyVariableIncome(state.variableIncomes)
  const monthlyData      = getVariableExpensesByMonth(state.variableExpenses, 6)
  const incomeMonthlyData = getVariableIncomeByMonth(state.variableIncomes, 6)

  // Category breakdowns for current month
  const expCatBreakdown = VAR_EXP_CATS.map((cat) => ({
    name: cat,
    value: state.variableExpenses
      .filter((e) => { const d = new Date(e.date); const n = new Date(); return e.category === cat && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() })
      .reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.value > 0)

  const incCatBreakdown = VAR_INC_CATS.map((cat) => ({
    name: cat,
    value: state.variableIncomes
      .filter((i) => { const d = new Date(i.date); const n = new Date(); return i.category === cat && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() })
      .reduce((s, i) => s + i.amount, 0),
  })).filter((c) => c.value > 0)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'fixed',    label: 'Spese Fisse' },
    { key: 'variable', label: 'Spese Variabili' },
    { key: 'incomes',  label: 'Entrate Variabili' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Spese Fisse Attive</p>
          <p className="text-2xl font-bold font-mono text-white">{fmt(totalFixed)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {state.fixedExpenses.filter(isFixedExpenseActive).length}/{state.fixedExpenses.length} voci
          </p>
        </Card>
        <Card variant="gold" className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Spese Variabili</p>
          <p className="text-2xl font-bold font-mono text-white">{fmt(currentMonthVar)}</p>
          <p className="text-xs text-slate-500 mt-1">{currentMonthLabel()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Entrate Variabili</p>
          <p className="text-2xl font-bold font-mono text-accent">{fmt(currentMonthInc)}</p>
          <p className="text-xs text-slate-500 mt-1">{currentMonthLabel()}</p>
        </Card>
        <Card variant={currentMonthInc - currentMonthVar - totalFixed >= 0 ? 'emerald' : 'danger'} className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Flusso Netto</p>
          <p className={`text-2xl font-bold font-mono ${currentMonthInc - currentMonthVar - totalFixed >= 0 ? 'text-accent' : 'text-red-400'}`}>
            {fmt(currentMonthInc - currentMonthVar - totalFixed)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Entrate – tutte le spese</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === key ? 'bg-accent text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {(tab === 'variable' || tab === 'incomes') && (
          <Button size="sm" variant="secondary" onClick={() => setImportModal(true)}>
            <FileUp size={13} /> Importa Excel / CSV
          </Button>
        )}
      </div>

      {/* ── Fixed expenses ── */}
      {tab === 'fixed' && (
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader
              title="Spese Fisse"
              subtitle="Trascina ⠿ per riordinare"
              action={
                <Button size="sm" onClick={() => { setEditFixed(undefined); setFixedModal(true) }}>
                  <Plus size={13} /> Aggiungi
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['', 'Nome', 'Categoria', 'Importo/mese', 'Dal', 'Al', 'Stato', ''].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {state.fixedExpenses.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">Nessuna spesa fissa configurata</td></tr>
                  )}
                  {state.fixedExpenses.map((exp, idx) => {
                    const active = isFixedExpenseActive(exp)
                    return (
                      <tr
                        key={exp.id}
                        draggable
                        onDragStart={() => fixedDnd.onDragStart(idx)}
                        onDragOver={(e) => fixedDnd.onDragOver(e, idx)}
                        onDragEnd={fixedDnd.onDragEnd}
                        className={`hover:bg-white/[0.03] transition-colors cursor-default ${!active ? 'opacity-50' : ''}`}
                      >
                        <td className="pl-3 pr-1 py-3">
                          <GripVertical size={14} className="text-slate-600 cursor-grab active:cursor-grabbing" />
                        </td>
                        <td className="px-3 py-3 text-white font-medium">{exp.name}</td>
                        <td className="px-3 py-3">
                          <Badge variant="gray">
                            <span style={{ color: EXPENSE_COLORS[exp.category] }}>● </span>{exp.category}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-mono font-semibold text-white">{fmt(exp.amount)}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs">{formatDate(exp.startDate)}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs">
                          {exp.endDate
                            ? <span className="flex items-center gap-1"><Clock size={11} />{formatDate(exp.endDate)}</span>
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={active ? 'green' : 'red'}>{active ? 'Attiva' : 'Terminata'}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditFixed(exp); setFixedModal(true) }} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => deleteFixedExpense(exp.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {state.fixedExpenses.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-white/[0.08]">
                      <td colSpan={3} className="px-3 py-3 text-sm text-slate-400">Totale attivo/mese</td>
                      <td className="px-3 py-3 font-mono font-bold text-white text-base">{fmt(totalFixed)}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Per Categoria" />
            <div className="px-5 pb-5 space-y-3">
              {FIXED_CATS.map((cat) => {
                const total = state.fixedExpenses.filter((e) => e.category === cat && isFixedExpenseActive(e)).reduce((s, e) => s + e.amount, 0)
                if (total === 0) return null
                const pct = totalFixed > 0 ? (total / totalFixed) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 capitalize">{cat}</span>
                      <span className="text-slate-300 font-mono">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: EXPENSE_COLORS[cat] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Variable expenses ── */}
      {tab === 'variable' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            <Card>
              <CardHeader
                title="Spese Variabili"
                subtitle="Raggruppate per mese"
                action={
                  <Button size="sm" onClick={() => { setEditVar(undefined); setVarModal(true) }}>
                    <Plus size={13} /> Aggiungi
                  </Button>
                }
              />
              {state.variableExpenses.length === 0 ? (
                <div className="px-4 pb-8 pt-2 text-center text-slate-500 text-sm">Nessuna spesa registrata</div>
              ) : (
                <VariableExpenseGroups
                  expenses={state.variableExpenses}
                  fmt={fmt}
                  onEdit={(exp) => { setEditVar(exp); setVarModal(true) }}
                  onDelete={deleteVariableExpense}
                />
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Trend 6 Mesi" />
              <div className="px-4 pb-4">
                {privacyMode ? <PrivacyChart /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Spese']} contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Per Categoria" subtitle={currentMonthLabel()} />
              <div className="px-5 pb-5">
                {privacyMode ? <PrivacyChart height={150} /> : expCatBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={expCatBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value">
                        {expCatBreakdown.map((entry) => <Cell key={entry.name} fill={EXPENSE_COLORS[entry.name] || '#64748b'} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-36 flex items-center justify-center text-slate-500 text-xs">Nessuna spesa questo mese</div>
                )}
                {!privacyMode && (
                  <div className="space-y-1.5 mt-1">
                    {expCatBreakdown.map((cat) => (
                      <div key={cat.name} className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: EXPENSE_COLORS[cat.name] }} />
                          <span className="text-slate-400 capitalize">{cat.name}</span>
                        </div>
                        <span className="text-slate-300 font-mono">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Variable incomes ── */}
      {tab === 'incomes' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-3">
            <Card>
              <CardHeader
                title="Entrate Variabili"
                subtitle="Raggruppate per mese"
                action={
                  <Button size="sm" onClick={() => { setEditInc(undefined); setIncModal(true) }}>
                    <Plus size={13} /> Aggiungi
                  </Button>
                }
              />
              {state.variableIncomes.length === 0 ? (
                <div className="px-4 pb-8 pt-2 text-center text-slate-500 text-sm">Nessuna entrata registrata</div>
              ) : (
                <VariableIncomeGroups
                  incomes={state.variableIncomes}
                  fmt={fmt}
                  onEdit={(inc) => { setEditInc(inc); setIncModal(true) }}
                  onDelete={deleteVariableIncome}
                />
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Trend 6 Mesi" />
              <div className="px-4 pb-4">
                {privacyMode ? <PrivacyChart /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={incomeMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Entrate']} contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Per Categoria" subtitle={currentMonthLabel()} />
              <div className="px-5 pb-5">
                {privacyMode ? <PrivacyChart height={150} /> : incCatBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={incCatBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value">
                        {incCatBreakdown.map((entry) => <Cell key={entry.name} fill={INCOME_COLORS[entry.name] || '#64748b'} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ background: 'rgba(13,45,58,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-36 flex items-center justify-center text-slate-500 text-xs">Nessuna entrata questo mese</div>
                )}
                {!privacyMode && (
                  <div className="space-y-1.5 mt-1">
                    {incCatBreakdown.map((cat) => (
                      <div key={cat.name} className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: INCOME_COLORS[cat.name] }} />
                          <span className="text-slate-400 capitalize">{cat.name}</span>
                        </div>
                        <span className="text-accent font-mono">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      <ExcelImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        existingHashes={existingHashes}
        fixedExpenses={state.fixedExpenses}
        onImport={handleExcelImport}
      />

      {/* Modals — key ensures fresh form on each target change */}
      <FixedExpenseModal
        key={editFixed?.id ?? 'new-fixed'}
        open={fixedModal}
        onClose={() => { setFixedModal(false); setEditFixed(undefined) }}
        onSave={(e) => { editFixed ? updateFixedExpense(editFixed.id, e) : addFixedExpense(e) }}
        initial={editFixed}
      />
      <VariableExpenseModal
        key={editVar?.id ?? 'new-var'}
        open={varModal}
        onClose={() => { setVarModal(false); setEditVar(undefined) }}
        onSave={(e) => { editVar ? updateVariableExpense(editVar.id, e) : addVariableExpense(e) }}
        initial={editVar}
      />
      <VariableIncomeModal
        key={editInc?.id ?? 'new-inc'}
        open={incModal}
        onClose={() => { setIncModal(false); setEditInc(undefined) }}
        onSave={(i) => { editInc ? updateVariableIncome(editInc.id, i) : addVariableIncome(i) }}
        initial={editInc}
      />
    </div>
  )
}
