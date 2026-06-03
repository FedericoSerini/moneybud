import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Trash2, AlertTriangle, Download, Upload, Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatCurrency } from '../../utils/format'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'

export function Settings() {
  const { state, updateSettings } = useApp()
  const [form, setForm] = useState({ ...state.settings })

  useEffect(() => { setForm({ ...state.settings }) }, [state.settings])
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const exportData = () => {
    const data = JSON.stringify(state, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moneybud-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          window.localStorage.setItem('moneybud-state', JSON.stringify(data))
          window.location.reload()
        } catch {
          alert('File non valido')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const clearData = () => {
    if (window.confirm('Sei sicuro? Tutti i dati verranno eliminati definitivamente.')) {
      window.localStorage.removeItem('moneybud-state')
      window.location.reload()
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* General */}
      <Card>
        <CardHeader title="Impostazioni Generali" subtitle="Profilo finanziario di base" />
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reddito per Mensilità (netto)" type="number" prefix="€" placeholder="2500"
              value={form.monthlyIncome || ''} onChange={(e) => set('monthlyIncome', Number(e.target.value))} />
            <Select label="Mensilità" value={String(form.salaryInstallments)} onChange={(e) => set('salaryInstallments', Number(e.target.value) as 12 | 13 | 14)}>
              <option value="12">12 mensilità</option>
              <option value="13">13 (con tredicesima)</option>
              <option value="14">14 (con quattordicesima)</option>
            </Select>
          </div>
          {form.salaryInstallments > 12 && form.monthlyIncome > 0 && (
            <p className="text-xs text-slate-400">
              Reddito effettivo mensile:{' '}
              <span className="text-accent font-mono font-semibold">
                {formatCurrency((form.monthlyIncome * form.salaryInstallments) / 12)}
              </span>
              {' '}(media su 12 mesi)
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Rendimento Atteso Annuo" type="number" step="0.5" suffix="%" placeholder="7"
              value={form.expectedReturn || ''} onChange={(e) => set('expectedReturn', Number(e.target.value))} />
            <Select label="Profilo di Rischio" value={form.riskProfile} onChange={(e) => set('riskProfile', e.target.value)}>
              <option value="conservativo">Conservativo (3-4%)</option>
              <option value="moderato">Moderato (5-7%)</option>
              <option value="aggressivo">Aggressivo (8-10%)</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Alert reminders */}
      <Card>
        <CardHeader title="Alert e Promemoria" subtitle="Notifiche in-app per mantenere i dati aggiornati" />
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Bell size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Promemoria spese variabili</p>
                <p className="text-xs text-slate-500">Mostra un alert se non inserisci spese da 7 giorni</p>
              </div>
            </div>
            <button
              onClick={() => set('alertVariableExpenses', !form.alertVariableExpenses)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.alertVariableExpenses ? 'bg-accent/20 border border-accent/30' : 'glass'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-1 ${form.alertVariableExpenses ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Bell size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Promemoria liquidità fine mese</p>
                <p className="text-xs text-slate-500">Ricordati di aggiornare il saldo del conto corrente</p>
              </div>
            </div>
            <button
              onClick={() => set('alertLiquidity', !form.alertLiquidity)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.alertLiquidity ? 'bg-accent/20 border border-accent/30' : 'glass'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-1 ${form.alertLiquidity ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader title="Anthropic API Key" subtitle="Per i consigli finanziari AI (Claude)" />
        <div className="px-5 pb-5 space-y-4">
          <div className="relative">
            <Input label="API Key" type={showKey ? 'text' : 'password'} placeholder="sk-ant-..."
              value={form.claudeApiKey} onChange={(e) => set('claudeApiKey', e.target.value)} />
            <button type="button" onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-[30px] text-slate-500 hover:text-slate-300 transition-colors">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="glass rounded-lg p-3 text-xs text-slate-400">
            L'API key è salvata <strong className="text-slate-300">solo localmente</strong> nel browser. Ottienila su <span className="text-accent">console.anthropic.com</span>.
          </div>
        </div>
      </Card>

      <Button onClick={handleSave} className="w-full justify-center py-3">
        <Save size={16} />
        {saved ? (
          <span className="text-xs font-semibold text-accent-light glass-emerald px-2 py-1 rounded-lg">
            Salvato ✓
          </span>
        ) : 'Salva Impostazioni'}
      </Button>

      {/* Data management */}
      <Card>
        <CardHeader title="Gestione Dati" subtitle="Backup, esportazione e migrazione" />
        <div className="px-5 pb-5 space-y-3">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportData} className="flex-1 justify-center">
              <Download size={15} /> Esporta Backup
            </Button>
            <Button variant="secondary" onClick={importData} className="flex-1 justify-center">
              <Upload size={15} /> Importa Backup
            </Button>
          </div>
          <div className="glass rounded-lg p-3 text-xs text-slate-400">
            Il backup esportato viene migrato automaticamente all'ultima versione del modello dati all'importazione.
          </div>
          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-3">Zona pericolosa</p>
            <div className="glass-danger rounded-xl p-3">
              <Button variant="danger" onClick={clearData} className="w-full justify-center">
                <Trash2 size={15} /> Elimina tutti i dati
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3 text-sm text-slate-400">
          <AlertTriangle size={16} className="text-gold shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300">Privacy:</strong> Tutti i dati sono salvati esclusivamente nel localStorage del tuo browser. Nessun dato è trasmesso a server esterni ad eccezione di Yahoo Finance (prezzi azioni) e Anthropic (consigli AI, solo se configurata).
          </div>
        </div>
      </Card>
    </div>
  )
}
