import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, Landmark, BarChart2, Coins, Bitcoin } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getPortfolioValue, getPortfolioCost,
  getSecurityGrossGain, getSecurityNetGain, getSecurityTaxEstimate,
  getBondValue, getBondCost, getBondGrossGain, getBondNetGain, getBondAnnualCoupon,
  getPACTotalInvested, getPACTotalQuantity, getPACCurrentValue,
  getTotalBondAnnualCoupon,
  getPACTaxEstimate,
  getPACTotalCost,
} from '../../utils/calculations'
import { formatCurrency, formatPercent, formatDate } from '../../utils/format'
import { usePrivacy } from '../../hooks/usePrivacy'
import { Card, CardHeader } from '../ui/Card'
import { Security } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportRow {
  id: string
  name: string
  label?: string
  invested: number
  currentValue: number
  grossPnl: number
  netPnl?: number
  taxes?: number
  extra?: string
}

interface ReportSection {
  key: string
  title: string
  icon: React.ElementType
  color: string
  rows: ReportRow[]
  annualIncome?: number
}

// ─── Section table ────────────────────────────────────────────────────────────

function SectionTable({ section, fmt }: { section: ReportSection; fmt: (n: number) => string }) {
  const [open, setOpen] = useState(true)
  const Icon = section.icon

  const totalInvested      = section.rows.reduce((s, r) => s + r.invested, 0)
  const totalCurrentValue  = section.rows.reduce((s, r) => s + r.currentValue, 0)
  const totalGross         = section.rows.reduce((s, r) => s + r.grossPnl, 0)
  const totalTaxes         = section.rows.reduce((s, r) => s + (r.taxes ?? 0), 0)
  const totalNet           = section.rows.reduce((s, r) => s + (r.netPnl ?? r.grossPnl), 0)
  const grossPct           = totalInvested > 0 ? (totalGross / totalInvested) * 100 : 0

  if (section.rows.length === 0) return null

  return (
    <Card>
      <div
        className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-colors rounded-t-xl"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
            <Icon size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{section.title}</p>
            <p className="text-xs text-slate-500">{section.rows.length} posizioni</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">Investito</p>
            <p className="text-sm font-mono text-slate-300">{fmt(totalInvested)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Valore</p>
            <p className="text-sm font-mono font-semibold text-white">{fmt(totalCurrentValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">P&L netto</p>
            <p className={`text-sm font-mono font-semibold ${totalNet >= 0 ? 'text-accent' : 'text-red-400'}`}>
              {fmt(totalNet)} <span className="text-xs opacity-70">({formatPercent(grossPct)})</span>
            </p>
          </div>
          {section.annualIncome !== undefined && section.annualIncome > 0 && (
            <div className="text-right hidden md:block">
              <p className="text-xs text-slate-500">Cedole/anno</p>
              <p className="text-sm font-mono text-amber-400">{fmt(section.annualIncome)}</p>
            </div>
          )}
          <div className="text-slate-500 ml-2">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-4 py-2 text-left text-slate-500 font-medium">Strumento</th>
                <th className="px-4 py-2 text-right text-slate-500 font-medium">Investito</th>
                <th className="px-4 py-2 text-right text-slate-500 font-medium">Valore</th>
                <th className="px-4 py-2 text-right text-slate-500 font-medium">P&L Lordo</th>
                <th className="px-4 py-2 text-right text-slate-500 font-medium">Tasse Est.</th>
                <th className="px-4 py-2 text-right text-slate-500 font-medium">P&L Netto</th>
                {section.annualIncome !== undefined && (
                  <th className="px-4 py-2 text-right text-slate-500 font-medium">Info</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {section.rows.map((row) => {
                const rowGrossPct = row.invested > 0 ? (row.grossPnl / row.invested) * 100 : 0
                const netPnl = row.netPnl ?? row.grossPnl
                return (
                  <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-white">{row.name}</p>
                      {row.label && <span className="text-slate-600">{row.label}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">{fmt(row.invested)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-white">{fmt(row.currentValue)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${row.grossPnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                      <div>{fmt(row.grossPnl)}</div>
                      <div className="opacity-60">{formatPercent(rowGrossPct)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400">
                      {row.taxes !== undefined ? fmt(row.taxes) : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${netPnl >= 0 ? 'text-accent' : 'text-red-400'}`}>
                      {fmt(netPnl)}
                    </td>
                    {section.annualIncome !== undefined && (
                      <td className="px-4 py-2.5 text-right text-slate-500">{row.extra ?? '—'}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.06] bg-white/[0.03]">
                <td className="px-4 py-2 text-xs font-semibold text-slate-400">Totale sezione</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">{fmt(totalInvested)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-white">{fmt(totalCurrentValue)}</td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${totalGross >= 0 ? 'text-accent' : 'text-red-400'}`}>{fmt(totalGross)}</td>
                <td className="px-4 py-2 text-right font-mono text-amber-400">{totalTaxes > 0 ? fmt(totalTaxes) : '—'}</td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${totalNet >= 0 ? 'text-accent' : 'text-red-400'}`}>{fmt(totalNet)}</td>
                {section.annualIncome !== undefined && (
                  <td className="px-4 py-2 text-right font-mono text-amber-400">
                    {section.annualIncome > 0 ? fmt(section.annualIncome) : '—'}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─── Helper: build a securities section from a filtered list ──────────────────

function buildSecuritiesSection(
  key: string,
  title: string,
  icon: React.ElementType,
  color: string,
  securities: Security[],
): ReportSection {
  return {
    key,
    title,
    icon,
    color,
    rows: securities.map((sec) => ({
      id: sec.id,
      name: `${sec.symbol} — ${sec.name}`,
      label: sec.ter ? `TER ${sec.ter}%` : undefined,
      invested:     sec.quantity * sec.purchasePrice + (sec.commissions ?? 0),
      currentValue: sec.quantity * (sec.currentPrice ?? sec.purchasePrice),
      grossPnl:     getSecurityGrossGain(sec),
      netPnl:       getSecurityNetGain(sec),
      taxes:        getSecurityTaxEstimate(sec),
    })),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InvestmentReport() {
  const { state } = useApp()
  const { fmt } = usePrivacy()

  const stocks      = state.securities.filter((s) => s.type === 'stock')
  const etfs        = state.securities.filter((s) => s.type === 'etf')
  const commodities = state.securities.filter((s) => s.type === 'commodity')
  const cryptos     = state.securities.filter((s) => s.type === 'crypto')

  const stocksSection     = buildSecuritiesSection('titoli',     'Titoli',      TrendingUp, 'bg-accent/10 text-accent',          stocks)
  const etfsSection       = buildSecuritiesSection('etf',        'ETF',         BarChart2,  'bg-blue-500/10 text-blue-400',      etfs)
  const commoditiesSection = buildSecuritiesSection('commodity', 'Commodities', Coins,      'bg-yellow-500/10 text-yellow-400',  commodities)
  const cryptoSection     = buildSecuritiesSection('crypto',     'Crypto',      Bitcoin,    'bg-orange-500/10 text-orange-400',  cryptos)

  const bondsSection: ReportSection = {
    key: 'obbligazioni',
    title: 'Obbligazioni',
    icon: Landmark,
    color: 'bg-amber-500/10 text-amber-400',
    annualIncome: getTotalBondAnnualCoupon(state.bonds),
    rows: state.bonds.map((bond) => ({
      id: bond.id,
      name: bond.isin ? `${bond.name} (${bond.isin})` : bond.name,
      label: bond.issuer,
      invested:     getBondCost(bond),
      currentValue: getBondValue(bond),
      grossPnl:     getBondGrossGain(bond),
      netPnl:       getBondNetGain(bond),
      taxes:        Math.max(0, getBondGrossGain(bond)) * bond.taxRate / 100,
      extra:        `Cedola ${formatCurrency(getBondAnnualCoupon(bond))}/anno · Scad. ${formatDate(bond.maturityDate)}`,
    })),
  }

  const pacSection: ReportSection = {
    key: 'pac',
    title: 'PAC — Piani di Accumulo',
    icon: BarChart2,
    color: 'bg-indigo-500/10 text-indigo-400',
    rows: state.pacPlans.map((plan) => {
      const linkedSec   = state.securities.find((s) => s.symbol === plan.symbol)
      const marketPrice = plan.currentPrice ?? linkedSec?.currentPrice
      const invested    = getPACTotalInvested(plan)
      const qty         = getPACTotalQuantity(plan)
      const currentVal  = marketPrice && qty > 0
        ? getPACCurrentValue(plan, marketPrice)
        : invested
      const grossPnl    = currentVal - invested
      const taxes       = getPACTaxEstimate(plan)
      const netPnl      = grossPnl - taxes - getPACTotalCost(plan) + invested  // consider effective cost including estimated taxes
      return {
        id:           plan.id,
        name:         `${plan.symbol} — ${plan.name}`,
        label:        plan.active ? 'Attivo' : 'Sospeso',
        invested,
        currentValue: currentVal,
        grossPnl,
        taxes,
        netPnl,
        extra:        `${qty.toFixed(4)} quote · ${formatCurrency(plan.monthlyAmount)}/mese`,
      }
    }),
  }

  const sections: ReportSection[] = [
    stocksSection, etfsSection, pacSection, bondsSection, commoditiesSection, cryptoSection,
  ]

  // ── Grand totals ────────────────────────────────────────────────────────────

  const allRows = sections.flatMap((s) => s.rows)
  const grandInvested     = allRows.reduce((s, r) => s + r.invested, 0)
  const grandCurrentValue = allRows.reduce((s, r) => s + r.currentValue, 0)
  const grandGross        = allRows.reduce((s, r) => s + r.grossPnl, 0)
  const grandNet          = allRows.reduce((s, r) => s + (r.netPnl ?? r.grossPnl), 0)
  const grandTaxes        = allRows.reduce((s, r) => s + (r.taxes ?? 0), 0)
  const grandGrossPct     = grandInvested > 0 ? (grandGross / grandInvested) * 100 : 0
  const grandNetPct       = grandInvested > 0 ? (grandNet  / grandInvested) * 100 : 0
  const totalAnnualCoupon = getTotalBondAnnualCoupon(state.bonds)

  if (allRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
        <BarChart2 size={40} className="text-slate-600" />
        <p className="text-slate-400 text-sm">Nessun investimento registrato.</p>
        <p className="text-slate-600 text-xs">Aggiungi titoli, ETF, obbligazioni, PAC, commodities o crypto per vedere il rendiconto.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Totale Investito',   value: fmt(grandInvested),     color: 'text-slate-300' },
          { label: 'Controvalore',       value: fmt(grandCurrentValue), color: 'text-white' },
          { label: 'P&L Lordo (Performance)',          value: fmt(grandGross),        sub: formatPercent(grandGrossPct), color: grandGross >= 0 ? 'text-accent' : 'text-red-400' },
          { label: 'Tasse Stimate',      value: fmt(grandTaxes),        sub: 'Solo plusvalenze',           color: 'text-amber-400' },
          { label: 'P&L Netto (Tasse+Costi)',          value: fmt(grandNet),          sub: formatPercent(grandNetPct),   color: grandNet  >= 0 ? 'text-accent' : 'text-red-400' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
            {'sub' in stat && stat.sub && <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>}
          </Card>
        ))}
      </div>

      {totalAnnualCoupon > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
          <Landmark size={15} className="shrink-0" />
          <span>
            Reddito cedolare annuo stimato: <strong className="text-white">{fmt(totalAnnualCoupon)}</strong>
            {' '}({fmt(totalAnnualCoupon / 12)}/mese)
          </span>
        </div>
      )}

      {/* Per-section tables */}
      {sections.map((section) => (
        <SectionTable key={section.key} section={section} fmt={fmt} />
      ))}

      {/* Grand total */}
      {sections.filter((s) => s.rows.length > 0).length > 1 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-white/[0.03]">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Riepilogo Complessivo</p>
          </div>
          <div className="border-t border-white/[0.06] overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-2 text-left text-slate-500 font-medium w-1/3">Totale investito</th>
                  <td className="px-4 py-2 font-mono text-slate-300">{fmt(grandInvested)}</td>
                </tr>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-2 text-left text-slate-500 font-medium">Controvalore attuale</th>
                  <td className="px-4 py-2 font-mono font-semibold text-white">{fmt(grandCurrentValue)}</td>
                </tr>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-2 text-left text-slate-500 font-medium">P&L Lordo</th>
                  <td className={`px-4 py-2 font-mono font-semibold ${grandGross >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    {fmt(grandGross)} ({formatPercent(grandGrossPct)})
                  </td>
                </tr>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-2 text-left text-slate-500 font-medium">Tasse stimate</th>
                  <td className="px-4 py-2 font-mono text-amber-400">{fmt(grandTaxes)}</td>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-left text-slate-400 font-semibold">P&L Netto</th>
                  <td className={`px-4 py-2 font-mono font-bold text-base ${grandNet >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    {fmt(grandNet)} ({formatPercent(grandNetPct)})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
