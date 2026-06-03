import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, X, AlertTriangle, Info } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatDate } from '../../utils/format'
import { transactionImportHash } from '../../utils/hash'
import { VariableExpenseCategory, VariableIncomeCategory, FixedExpense } from '../../types'
import { isFixedExpenseActive } from '../../utils/calculations'

const VAR_EXP_CATS: VariableExpenseCategory[] = [
  'alimentari','ristoranti','abbigliamento','salute','intrattenimento','viaggi','trasporti','casa','tecnologia','utenze','banca','altro',
]
const VAR_INC_CATS: VariableIncomeCategory[] = [
  'freelance','bonus','dividendi','affitto','vendita','rimborso','regalo','altro',
]

interface ParsedRow {
  id: number
  date: string
  description: string
  amount: number
  type: 'expense' | 'income'
  expenseCategory: VariableExpenseCategory
  incomeCategory: VariableIncomeCategory
  selected: boolean
  importHash: string
  duplicate: boolean
  matchedFixedExpense?: string
}

function parseItalianDate(raw: unknown): string {
  if (!raw) return ''

  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (!date) return ''
    const mm = String(date.m).padStart(2, '0')
    const dd = String(date.d).padStart(2, '0')
    return `${date.y}-${mm}-${dd}`
  }

  const s = String(raw).trim()

  const slashParts = s.split('/')
  if (slashParts.length === 3) {
    const [dd, mm, yyyy] = slashParts
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  // "dd-mm-yyyy"
  const dashParts = s.split('-')
  if (dashParts.length === 3 && dashParts[0].length <= 2) {
    const [dd, mm, yyyy] = dashParts
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  return ''
}

function parseItalianNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return raw
  const s = String(raw).trim().replace(/\s/g, '')
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

function suggestExpenseCategory(description: string): VariableExpenseCategory {
  const d = description.toUpperCase()
  if (/SUPERMERCATO|SUPERMERCATI|COOP|ELITE\b|LIDL|ESSELUNGA|CARREFOUR|IPER|CONAD|PENNY|PAM\b|EUROSPIN|BIM|EATALY/.test(d)) return 'alimentari'
  if (/RISTORANTE|TRATTORIA|PIZZERIA|PIZZA|MENSA|MATTARELLO|OSTERIA|SUSHI|MCDONALD|MC DONALD|CARNEZZERIA|BURGER|KFC|CAFFE|CAFE\b|PASTICCER|JUSTEATITALY|STAMIRA|GELATERIA/.test(d)) return 'ristoranti'
  if (/ZALANDO|ZARA|SARTORIA|H&M|MANGO|PULL&BEAR|PRIMARK|SEPHORA|OVS|COIN\b|ABBIGLIAMENTO|CALZEDONIA|INTIMISSIMI/.test(d)) return 'abbigliamento'
  if (/FARMACIA|MEDIC|DOTT\.|OSPEDAL|CLINIC|DENTAL|OTTIC|PARAFARMA|FISIOTERAPIA/.test(d)) return 'salute'
  if (/NETFLIX|SPOTIFY|DISNEY|DAZN|COMEHOME|SKY|BUDDHA SMILE|BUDDHA PUB\b|PRIME VIDEO|MEETING PLACE|GOLDEN POT|RQUADRO|BEER|JAKO 24|BARATTA|BAR|CINEMA|TEATRO|BORDI MARA|MONDADORI|ACCONCIAMESSA|APPLE\.COM\/BILL/.test(d)) return 'intrattenimento'
  if (/HOTEL|AGODA|BOOKING|RYANAIR|EASYJET|TRENITALIA|PEDAGGIO|ITALO\b|FLIXBUS|AIRBNB|BLABLACAR/.test(d)) return 'viaggi'
  if (/ENI|STAROIL|MAREMMANA PETROLI|TAMOIL|AUTO ROYAL COMPANY|BOSH CAR SERVICE|TOYOTA|HYUNDAI|PRIMA/.test(d)) return 'trasporti'
  if (/IKEA|BRICOCENTRE|BRICOCENTER|LEROY|MAURY|CASTORAMA|OBI\b|BRICO/.test(d)) return 'casa'
  if (/APPLE STORE|GOOGLE PLAY|MICROSOFT|SAMSUNG|UNIEURO|MEDIAWORLD|EURONICS|CLAUDE.AI|FNAC/.test(d)) return 'tecnologia'
  if (/ENEL|ENI GAS|A2A|HERA|EDISON\b|ACQUA |GAS\b|LUCE |ELETTRIC|VODAFONE|TIM\b|WIND\b|FASTWEB|TELECOM/.test(d)) return 'utenze'
  return 'altro'
}

function suggestIncomeCategory(description: string): VariableIncomeCategory {
  const d = description.toUpperCase()
  if (/BONUS|PREMIO|PREMI\b/.test(d)) return 'bonus'
  if (/DIVIDENDO|DIVIDEND/.test(d)) return 'dividendi'
  if (/AFFITTO|LOCAZIONE/.test(d)) return 'affitto'
  if (/VENDITA|SOLD\b/.test(d)) return 'vendita'
  if (/RIMBORSO|REFUND|RESTITUZ/.test(d)) return 'rimborso'
  if (/REGALO|DONO\b/.test(d)) return 'regalo'
  if (/FREELANCE|FATTURA|ONORARIO|CONSULENZ/.test(d)) return 'freelance'
  return 'altro'
}

// Nota: questa funzione è una semplice euristica basata sul nome della spesa fissa e potrebbe non essere sempre accurata. L'obiettivo è solo identificare potenziali corrispondenze per avvisare l'utente, che può poi decidere se deselezionare o meno.
function suggestFixedExpense(description: string): string | undefined {
  if (/AFFITTO|MUTUO|MUTUI|ADDEBITO RATA FINANZIAMENTO/.test(description.toUpperCase())) return 'mutuo'
  if (/ADDEBITO RATA FINANZIAMENTO/.test(description.toUpperCase())) return 'assicurazioni'
  if (/FASTWEB/.test(description.toUpperCase())) return 'utenze'
  if (/PRIMA/.test(description.toUpperCase())) return 'trasporti'
  if (/CANONE CONTO\b/.test(description.toUpperCase())) return 'banca'
  if (/TELEPASS|TPAY X|NESPRESSO|SPOTIFY/.test(description.toUpperCase())) return 'abbonamenti'
  return undefined
}

function matchFixedExpense(description: string, fixedExpenses: FixedExpense[]): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').trim()
  const descNorm = normalize(description)
  for (const fe of fixedExpenses) {
    if (!isFixedExpenseActive(fe)) continue
    const words = normalize(fe.name).split(/\s+/).filter(w => w.length >= 3)
    if (words.length > 0 && words.some(w => descNorm.includes(w))) return fe.name
    if (suggestFixedExpense(description) && fe.category === suggestFixedExpense(description)) return fe.name
  }
  return undefined
}

function buildRow(
  id: number,
  date: string,
  description: string,
  amount: number,
  type: 'expense' | 'income',
  existingHashes: Set<string>,
  seenInFile: Set<string>,
  fixedExpenses: FixedExpense[],
): ParsedRow {
  const absAmount = Math.abs(amount)
  const hash = type === 'expense'
    ? transactionImportHash(date, absAmount, 0, description)
    : transactionImportHash(date, 0, absAmount, description)
  const duplicate = existingHashes.has(hash) || seenInFile.has(hash)
  seenInFile.add(hash)
  const matchedFixedExpense = type === 'expense' ? matchFixedExpense(description, fixedExpenses) : undefined
  return {
    id,
    date,
    description,
    amount: absAmount,
    type,
    expenseCategory: type === 'expense' ? suggestExpenseCategory(description) : 'altro',
    incomeCategory: type === 'income' ? suggestIncomeCategory(description) : 'altro',
    selected: !duplicate && !matchedFixedExpense,
    importHash: hash,
    duplicate,
    matchedFixedExpense,
  }
}

function parseExcelRows(
  file: File,
  existingHashes: Set<string>,
  fixedExpenses: FixedExpense[],
): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        let headerIdx = -1
        for (let i = 0; i < raw.length; i++) {
          if (raw[i].some((cell) => String(cell).toLowerCase().includes('data contabile'))) {
            headerIdx = i
            break
          }
        }

        if (headerIdx === -1) {
          reject(new Error('Intestazione "Data Contabile" non trovata nel file.'))
          return
        }

        const header = raw[headerIdx].map((c) => String(c).toLowerCase())
        const colDate   = header.findIndex((h) => h.includes('data contabile'))
        const colDebit  = header.findIndex((h) => h.includes('addebiti'))
        const colCredit = header.findIndex((h) => h.includes('accrediti'))
        const colDesc   = header.findIndex((h) => h.includes('descrizione'))

        if (colDate === -1 || colDebit === -1 || colCredit === -1 || colDesc === -1) {
          reject(new Error('Colonne richieste non trovate. Verifica che il file contenga: Data Contabile, Addebiti, Accrediti, Descrizione.'))
          return
        }

        const seenInFile = new Set<string>()
        const rows: ParsedRow[] = []

        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i]
          const date = parseItalianDate(row[colDate])
          if (!date) continue

          const debit  = parseItalianNumber(row[colDebit])
          const credit = parseItalianNumber(row[colCredit])
          const description = String(row[colDesc] ?? '').trim()
          if (!description) continue

          if (debit > 0) {
            rows.push(buildRow(rows.length, date, description, debit, 'expense', existingHashes, seenInFile, fixedExpenses))
          }
          if (credit > 0) {
            rows.push(buildRow(rows.length, date, description, credit, 'income', existingHashes, seenInFile, fixedExpenses))
          }
        }

        if (rows.length === 0) {
          reject(new Error('Nessuna transazione trovata nel file.'))
          return
        }
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Errore nella lettura del file.'))
    reader.readAsArrayBuffer(file)
  })
}

function parseCsvRows(
  file: File,
  existingHashes: Set<string>,
  fixedExpenses: FixedExpense[],
): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target!.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())

        let headerIdx = -1
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('data contabile')) {
            headerIdx = i
            break
          }
        }

        if (headerIdx === -1) {
          reject(new Error('Intestazione "Data contabile" non trovata nel file CSV.'))
          return
        }

        const header = lines[headerIdx].split(';').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
        const colDate   = header.findIndex(h => h.includes('data contabile'))
        const colDesc   = header.findIndex(h => h.includes('descrizione'))
        const colDetail = header.findIndex(h => h.includes('dettaglio'))
        const colAmount = header.findIndex(h => h.includes('importo'))

        if (colDate === -1 || colDesc === -1 || colAmount === -1) {
          reject(new Error('Colonne richieste non trovate. Il CSV deve contenere: Data contabile, Descrizione, Importo.'))
          return
        }

        const seenInFile = new Set<string>()
        const rows: ParsedRow[] = []

        for (let i = headerIdx + 1; i < lines.length; i++) {
          const cols = lines[i].split(';').map(c => c.trim().replace(/^["']|["']$/g, ''))
          const date = parseItalianDate(cols[colDate])
          if (!date) continue

          const descMain   = cols[colDesc] ?? ''
          const descDetail = colDetail !== -1 ? (cols[colDetail] ?? '') : ''
          const description = [descMain, descDetail].filter(Boolean).join(' — ')
          if (!descMain) continue

          const amount = parseItalianNumber(cols[colAmount])
          if (amount === 0) continue

          const type: 'expense' | 'income' = amount < 0 ? 'expense' : 'income'
          rows.push(buildRow(rows.length, date, description, amount, type, existingHashes, seenInFile, fixedExpenses))
        }

        if (rows.length === 0) {
          reject(new Error('Nessuna transazione trovata nel file CSV.'))
          return
        }
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Errore nella lettura del file.'))
    reader.readAsText(file, 'utf-8')
  })
}

interface Props {
  open: boolean
  onClose: () => void
  existingHashes: Set<string>
  fixedExpenses: FixedExpense[]
  onImport: (
    expenses: Array<{ date: string; description: string; amount: number; category: VariableExpenseCategory; importHash: string }>,
    incomes:  Array<{ date: string; description: string; amount: number; category: VariableIncomeCategory; importHash: string }>,
  ) => void
}

export function ExcelImportModal({ open, onClose, existingHashes, fixedExpenses, onImport }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => { setRows([]); setError(''); setFileName('') }
  const handleClose = () => { reset(); onClose() }

  const handleFile = async (file: File) => {
    if (!file) return
    setLoading(true)
    setError('')
    setFileName(file.name)
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv')
      const parsed = isCsv
        ? await parseCsvRows(file, existingHashes, fixedExpenses)
        : await parseExcelRows(file, existingHashes, fixedExpenses)
      setRows(parsed)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel parsing del file.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const update = (id: number, patch: Partial<ParsedRow>) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))

  const toggleAll = (selected: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, selected })))

  const handleImport = () => {
    const selected = rows.filter((r) => r.selected)
    const expenses = selected
      .filter((r) => r.type === 'expense')
      .map((r) => ({ date: r.date, description: r.description, amount: r.amount, category: r.expenseCategory, importHash: r.importHash }))
    const incomes = selected
      .filter((r) => r.type === 'income')
      .map((r) => ({ date: r.date, description: r.description, amount: r.amount, category: r.incomeCategory, importHash: r.importHash }))
    onImport(expenses, incomes)
    handleClose()
  }

  const selectedCount      = rows.filter((r) => r.selected).length
  const expenseCount       = rows.filter((r) => r.selected && r.type === 'expense').length
  const incomeCount        = rows.filter((r) => r.selected && r.type === 'income').length
  const duplicateCount     = rows.filter((r) => r.duplicate).length
  const fixedMatchCount    = rows.filter((r) => r.matchedFixedExpense && !r.duplicate).length

  return (
    <Modal open={open} onClose={handleClose} title="Importa transazioni" size="lg">
      <div className="space-y-4">

        {/* Drop zone */}
        {rows.length === 0 && !loading && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="glass border-2 border-dashed border-white/[0.15] hover:border-accent/40 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <Upload size={32} className="mx-auto mb-3 text-slate-500 group-hover:text-accent transition-colors" />
            <p className="text-sm text-slate-300 font-medium">Trascina il file qui oppure clicca per selezionarlo</p>
            <p className="text-xs text-slate-500 mt-1">Formati supportati: .xlsx, .xls, .csv</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-slate-600">
                <span className="text-slate-500 font-medium">Excel:</span> colonne Data Contabile · Addebiti · Accrediti · Descrizione
              </p>
              <p className="text-xs text-slate-600">
                <span className="text-slate-500 font-medium">CSV:</span> colonne Data contabile · Data valuta · Descrizione · Dettaglio · Importo (separatore <code className="bg-surface-700 px-1 rounded">;</code>)
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Parsing del file in corso…</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 glass-danger rounded-xl text-red-300 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate warning */}
        {duplicateCount > 0 && rows.length > 0 && (
          <div className="flex items-start gap-3 p-3 glass-gold rounded-xl text-gold text-sm">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>{duplicateCount}</strong> transazion{duplicateCount === 1 ? 'e già presente' : 'i già presenti'} — deselezionat{duplicateCount === 1 ? 'a' : 'e'} in automatico.
              Puoi comunque selezionarle manualmente se vuoi reimportarle.
            </span>
          </div>
        )}

        {/* Fixed expense match warning */}
        {fixedMatchCount > 0 && rows.length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>{fixedMatchCount}</strong> transazion{fixedMatchCount === 1 ? 'e sembra corrispondere' : 'i sembrano corrispondere'} a una spesa fissa già registrata — deselezionat{fixedMatchCount === 1 ? 'a' : 'e'} per evitare doppio conteggio.
              Verifica il badge <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">spesa fissa</span> e seleziona manualmente se si tratta di importi aggiuntivi.
            </span>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <FileText size={14} />
                <span className="font-medium text-slate-200 truncate max-w-[200px]">{fileName}</span>
                <span>— {rows.length} transazioni trovate</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAll(true)}  className="text-xs text-accent hover:underline">Seleziona tutto</button>
                <span className="text-slate-600">|</span>
                <button onClick={() => toggleAll(false)} className="text-xs text-slate-400 hover:underline">Deseleziona tutto</button>
                <span className="text-slate-600">|</span>
                <button onClick={reset} className="text-xs text-slate-400 hover:text-red-400 hover:underline flex items-center gap-1">
                  <X size={11} /> Cambia file
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 glass z-10">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-3 py-2 text-left text-slate-500 font-medium w-8">
                      <input
                        type="checkbox"
                        checked={rows.every((r) => r.selected)}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="accent-accent"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Data</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Descrizione</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Categoria</th>
                    <th className="px-3 py-2 text-right text-slate-500 font-medium">Importo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${row.selected ? 'hover:bg-white/[0.06]' : 'opacity-40 hover:bg-white/[0.03]'}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => update(row.id, { selected: e.target.checked })}
                          className="accent-accent"
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                        {row.date ? formatDate(row.date) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-200 max-w-[220px]">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="truncate" title={row.description}>{row.description}</span>
                          {row.duplicate && (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[10px] font-medium glass-gold text-gold">
                              duplicato
                            </span>
                          )}
                          {row.matchedFixedExpense && !row.duplicate && (
                            <span
                              className="shrink-0 px-1 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20 cursor-help"
                              title={`Potenziale corrispondenza con la spesa fissa: "${row.matchedFixedExpense}"`}
                            >
                              spesa fissa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.type === 'expense' ? 'bg-red-500/15 text-red-300' : 'bg-accent/15 text-accent'}`}>
                          {row.type === 'expense' ? 'Spesa' : 'Entrata'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.type === 'expense' ? (
                          <select
                            value={row.expenseCategory}
                            onChange={(e) => update(row.id, { expenseCategory: e.target.value as VariableExpenseCategory })}
                            className="bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-accent"
                          >
                            {VAR_EXP_CATS.map((c) => (
                              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={row.incomeCategory}
                            onChange={(e) => update(row.id, { incomeCategory: e.target.value as VariableIncomeCategory })}
                            className="bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-accent"
                          >
                            {VAR_INC_CATS.map((c) => (
                              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${row.type === 'expense' ? 'text-red-300' : 'text-accent'}`}>
                        {row.type === 'expense' ? '-' : '+'}€{row.amount.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-400 space-y-0.5">
                <p>{selectedCount} di {rows.length} transazioni selezionate</p>
                {selectedCount > 0 && (
                  <p className="text-slate-500">
                    {expenseCount > 0 && <span className="text-red-300">{expenseCount} spese</span>}
                    {expenseCount > 0 && incomeCount > 0 && <span className="mx-1">·</span>}
                    {incomeCount > 0 && <span className="text-accent">{incomeCount} entrate</span>}
                    {' '}verranno importate
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleClose}>Annulla</Button>
                <Button onClick={handleImport} disabled={selectedCount === 0}>
                  Importa {selectedCount > 0 ? selectedCount : ''} transazioni
                </Button>
              </div>
            </div>
          </>
        )}

        {rows.length === 0 && !loading && !error && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose}>Annulla</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
