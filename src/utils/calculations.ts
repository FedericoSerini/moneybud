import {
  Security, FixedExpense, VariableExpense, VariableIncome, Asset,
  PensionConfig, PACPlan, Bond, AppSettings, AlertDismissals, VoluntaryPayment,
} from '../types'

// ─── Income ───────────────────────────────────────────────────────────────────

/** Media mensile tenendo conto delle mensilità (13ª, 14ª) */
export function getPotentialMonthlyIncome(settings: AppSettings): number {
  return (settings.monthlyIncome * settings.salaryInstallments) / 12
}

export function getAnnualIncome(settings: AppSettings): number {
  return settings.monthlyIncome * settings.salaryInstallments
}

// ─── Variable income ──────────────────────────────────────────────────────────

export function getMonthlyVariableIncome(incomes: VariableIncome[], year?: number, month?: number): number {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth()
  return incomes
    .filter((i) => { const d = new Date(i.date); return d.getFullYear() === y && d.getMonth() === m })
    .reduce((sum, i) => sum + i.amount, 0)
}

export function getVariableIncomeByMonth(incomes: VariableIncome[], months = 6): { month: string; amount: number }[] {
  const result: { month: string; amount: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(d),
      amount: getMonthlyVariableIncome(incomes, d.getFullYear(), d.getMonth()),
    })
  }
  return result
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function getPortfolioValue(securities: Security[]): number {
  return securities.reduce((sum, s) => sum + s.quantity * (s.currentPrice ?? s.purchasePrice), 0)
}

export function getPortfolioCost(securities: Security[]): number {
  return securities.reduce((sum, s) => sum + s.quantity * s.purchasePrice + (s.commissions ?? 0), 0)
}

export function getSecurityGrossGain(s: Security): number {
  return s.quantity * (s.currentPrice ?? s.purchasePrice) - s.quantity * s.purchasePrice
}

export function getSecurityTaxableGain(s: Security): number {
  return Math.max(0, getSecurityGrossGain(s) - (s.commissions ?? 0))
}

export function getSecurityCostIncludingTaxes(s: Security): number {
  const gross = getSecurityGrossGain(s)
  const tax = Math.max(0, gross) * (s.taxRate ?? 26) / 100
  return s.quantity * s.purchasePrice + (s.commissions ?? 0) + tax
}

export function getSecurityTaxEstimate(s: Security): number {
  return getSecurityTaxableGain(s) * (s.taxRate ?? 26) / 100
}

export function getSecurityNetGain(s: Security): number {
  return getSecurityGrossGain(s) - (s.commissions ?? 0) - getSecurityTaxEstimate(s)
}

export function getSecurityAnnualTERCost(s: Security): number {
  if (!s.ter) return 0
  return s.quantity * (s.currentPrice ?? s.purchasePrice) * s.ter / 100
}

export function getTotalAnnualTERCost(securities: Security[]): number {
  return securities.reduce((sum, s) => sum + getSecurityAnnualTERCost(s), 0)
}

// ─── Bonds ────────────────────────────────────────────────────────────────────

export function getBondCost(b: Bond): number {
  return b.quantity * b.faceValue * b.purchasePrice / 100
}

export function getBondCostIncludingTaxes(b: Bond): number {
  const gross = getBondGrossGain(b)
  const tax = Math.max(0, gross) * b.taxRate / 100
  return getBondCost(b) + tax
}

export function getBondValue(b: Bond): number {
  return b.quantity * b.faceValue * (b.currentPrice ?? b.purchasePrice) / 100
}

export function getBondAnnualCoupon(b: Bond): number {
  return b.quantity * b.faceValue * b.couponRate / 100
}

export function getBondGrossGain(b: Bond): number {
  return getBondValue(b) - getBondCost(b)
}

export function getBondNetGain(b: Bond): number {
  const gross = getBondGrossGain(b)
  const tax = Math.max(0, gross) * b.taxRate / 100
  return gross - tax
}

export function getTotalBondValue(bonds: Bond[]): number {
  return bonds.reduce((sum, b) => sum + getBondValue(b), 0)
}

export function getTotalBondAnnualCoupon(bonds: Bond[]): number {
  return bonds.reduce((sum, b) => sum + getBondAnnualCoupon(b), 0)
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export function getTotalAssetValue(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.value, 0)
}

export function getTotalAnnualAssetIncome(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + (a.yearlyIncome ?? 0), 0)
}

// ─── Fixed expenses ───────────────────────────────────────────────────────────

export function isFixedExpenseActive(e: FixedExpense): boolean {
  if (!e.endDate) return true
  const now = new Date()
  return new Date(e.endDate) >= new Date(now.getFullYear(), now.getMonth(), 1)
}

export function getTotalMonthlyFixed(expenses: FixedExpense[]): number {
  return expenses.filter(isFixedExpenseActive).reduce((sum, e) => sum + e.amount, 0)
}

// ─── Variable expenses ────────────────────────────────────────────────────────

export function getMonthlyVariableExpenses(expenses: VariableExpense[], year?: number, month?: number): number {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth()
  return expenses
    .filter((e) => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m })
    .reduce((sum, e) => sum + e.amount, 0)
}

export function getVariableExpensesByMonth(expenses: VariableExpense[], months = 6): { month: string; amount: number }[] {
  const result: { month: string; amount: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(d),
      amount: getMonthlyVariableExpenses(expenses, d.getFullYear(), d.getMonth()),
    })
  }
  return result
}

// ─── Vehicle depreciation ─────────────────────────────────────────────────────

export function getVehicleDepreciatedValue(value: number, depreciationRate: number, years: number): number {
  return value * Math.pow(1 - depreciationRate / 100, years)
}

// ─── Pensions ─────────────────────────────────────────────────────────────────

/** Average monthly voluntary contribution derived from the last 12 months of payments. */
export function getMonthlyVoluntaryRate(payments: VoluntaryPayment[]): number {
  if (!payments || payments.length === 0) return 0
  const now = new Date()
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const total = payments
    .filter((p) => new Date(p.date) >= yearAgo)
    .reduce((sum, p) => sum + p.amount, 0)
  return total / 12
}

export function getEffectivePensionContrib(pension: PensionConfig, effectiveMonthlyIncome: number): number {
  const base = pension.contributionType === 'percent' && pension.contributionPercent != null
    ? (effectiveMonthlyIncome * pension.contributionPercent) / 100
    : pension.monthlyContribution
  const voluntaryRate = pension.voluntaryPayments?.length
    ? getMonthlyVoluntaryRate(pension.voluntaryPayments)
    : (pension.voluntaryContribution ?? 0)
  return base + voluntaryRate
}

export function getTotalPensionValue(pensions: PensionConfig[]): number {
  return pensions.reduce((sum, p) => sum + p.currentValue, 0)
}

export function getTotalMonthlyPensionContrib(pensions: PensionConfig[], effectiveMonthlyIncome = 0): number {
  return pensions.reduce((sum, p) => sum + getEffectivePensionContrib(p, effectiveMonthlyIncome) + p.employerContribution, 0)
}

// ─── PAC ──────────────────────────────────────────────────────────────────────

export function getPACTERCost(plan: PACPlan): number {
  if (!plan.ter) return 0
  const qty = getPACTotalQuantity(plan)
  const price = plan.currentPrice ?? plan.purchases.reduce((sum, p) => sum + p.price * p.quantity, 0) / qty
  return qty * price * plan.ter / 100
}

export function getPACTotalCost(plan: PACPlan): number {
  return plan.purchases.reduce((sum, p) => sum + p.amount + p.commission, 0) + getPACTERCost(plan)
}

export function getPACTotalInvested(plan: PACPlan): number {
  return plan.purchases.reduce((sum, p) => sum + p.amount + p.commission, 0)
}

export function getPACTotalQuantity(plan: PACPlan): number {
  return plan.purchases.reduce((sum, p) => sum + p.quantity, 0)
}

export function getPACCurrentValue(plan: PACPlan, currentPrice?: number): number {
  const qty = getPACTotalQuantity(plan)
  if (!currentPrice || qty === 0) return 0
  return qty * currentPrice
}

export function getPACGrossGain(plan: PACPlan): number {
  return getPACCurrentValue(plan, plan.currentPrice) - getPACTotalInvested(plan)
}

export function getPACCostIncludingTaxesAndTER(plan: PACPlan): number {
  const invested = getPACTotalInvested(plan)
  const tax = Math.max(0, getPACGrossGain(plan) - getPACTERCost(plan)) * (plan.taxRate ?? 26) / 100
  return invested + getPACTERCost(plan) + tax
}

export function getPACTaxableGain(plan: PACPlan): number {
  const invested = getPACTotalInvested(plan)
  const currentValue = getPACCurrentValue(plan, plan.currentPrice)
  const grossGain = currentValue - invested
  const commissions = plan.purchases.reduce((sum, p) => sum + p.commission, 0)
  return Math.max(0, grossGain - (commissions ?? 0))
}

export function getPACTaxEstimate(plan: PACPlan): number {
  return getPACTaxableGain(plan) * (plan.taxRate ?? 26) / 100
}

export function getPACNetValue(plan: PACPlan): number {
  return getPACCurrentValue(plan, plan.currentPrice) - getPACTaxEstimate(plan)
}


// ─── Wealth & balance ─────────────────────────────────────────────────────────

export function getTotalWealth(
  securities: Security[],
  assets: Asset[],
  pensions: PensionConfig[],
  pacPlans: PACPlan[],
  bonds: Bond[] = [],
): number {
  const pacValue = pacPlans.reduce((sum, plan) => {
    const sec = securities.find((s) => s.symbol === plan.symbol)
    return sum + getPACCurrentValue(plan, plan.currentPrice ?? sec?.currentPrice)
  }, 0)
  return getPortfolioValue(securities) + getTotalBondValue(bonds) + getTotalAssetValue(assets) + getTotalPensionValue(pensions) + pacValue
}

export function getMonthlyBalance(
  settings: AppSettings,
  fixedExpenses: FixedExpense[],
  variableExpenses: VariableExpense[],
  variableIncomes: VariableIncome[],
): number {
  const income = getMonthlyVariableIncome(variableIncomes)
  const fixed = getTotalMonthlyFixed(fixedExpenses)
  const variable = getMonthlyVariableExpenses(variableExpenses)
  return income - fixed - variable
}

export function getSavingsRate(monthlyBalance: number, effectiveMonthlyIncome: number): number {
  if (effectiveMonthlyIncome <= 0) return 0
  return Math.max(0, (monthlyBalance / effectiveMonthlyIncome) * 100)
}

// ─── Projections ──────────────────────────────────────────────────────────────

export function futureValue(pv: number, annualRate: number, years: number, monthlyContrib: number): number {
  if (annualRate === 0) return pv + monthlyContrib * 12 * years
  const r = annualRate / 100 / 12
  const n = years * 12
  return pv * Math.pow(1 + r, n) + monthlyContrib * ((Math.pow(1 + r, n) - 1) / r)
}

export function getProjections(currentWealth: number, monthlyBalance: number, expectedReturn: number) {
  const savings = Math.max(0, monthlyBalance)
  return [
    { year: 1,  label: '1 anno',   value: futureValue(currentWealth, expectedReturn, 1,  savings) },
    { year: 2,  label: '2 anni',   value: futureValue(currentWealth, expectedReturn, 2,  savings) },
    { year: 5,  label: '5 anni',   value: futureValue(currentWealth, expectedReturn, 5,  savings) },
    { year: 10, label: '10 anni',  value: futureValue(currentWealth, expectedReturn, 10, savings) },
    { year: 20, label: '20 anni',  value: futureValue(currentWealth, expectedReturn, 20, savings) },
  ]
}

export function getPensionProjection(pension: PensionConfig, effectiveMonthlyIncome = 0) {
  const yearsToRetirement = Math.max(0, pension.retirementAge - pension.currentAge)
  const monthlyOwn = getEffectivePensionContrib(pension, effectiveMonthlyIncome)
  const monthlyTotal = monthlyOwn + pension.employerContribution
  const projectedValue = futureValue(pension.currentValue, pension.expectedReturn, yearsToRetirement, monthlyTotal)
  const totalContributions = pension.currentValue + monthlyTotal * 12 * yearsToRetirement
  return { yearsToRetirement, projectedValue, totalContributions, totalGrowth: projectedValue - totalContributions }
}

// ─── Emergency fund ───────────────────────────────────────────────────────────

/** Average monthly alimentari spending over the last N months (months with data only) */
export function getAverageMonthlyAlimentari(variableExpenses: VariableExpense[], months = 6): number {
  const now = new Date()
  let total = 0
  let monthsWithData = 0
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthTotal = variableExpenses
      .filter((e) => {
        const ed = new Date(e.date)
        return e.category === 'alimentari' && ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth()
      })
      .reduce((sum, e) => sum + e.amount, 0)
    if (monthTotal > 0) { total += monthTotal; monthsWithData++ }
  }
  return monthsWithData > 0 ? total / monthsWithData : 0
}

/** Monthly base for the emergency fund: fixed expenses + avg monthly alimentari */
export function getEmergencyFundMonthlyBase(fixedExpenses: FixedExpense[], variableExpenses: VariableExpense[]): number {
  return getTotalMonthlyFixed(fixedExpenses) + getAverageMonthlyAlimentari(variableExpenses)
}

/** Total value of all fondo_emergenza assets */
export function getEmergencyFundValue(assets: Asset[]): number {
  return assets.filter((a) => a.type === 'fondo_emergenza').reduce((sum, a) => sum + a.value, 0)
}

/** How many months of expenses are covered by the emergency fund */
export function getEmergencyFundCoverageMonths(assets: Asset[], fixedExpenses: FixedExpense[], variableExpenses: VariableExpense[]): number {
  const base = getEmergencyFundMonthlyBase(fixedExpenses, variableExpenses)
  if (base <= 0) return 0
  return getEmergencyFundValue(assets) / base
}

// ─── Health score ─────────────────────────────────────────────────────────────
//
// Point allocation (total = 100):
//   Savings rate        30 pts
//   Fixed expense ratio 15 pts  (was 20)
//   Portfolio           15 pts  (was 20)
//   Pension             15 pts
//   Wealth ratio        10 pts  (was 15)
//   Emergency fund      15 pts  (new)

export function getFinancialHealthScore(
  savingsRate: number,
  effectiveMonthlyIncome: number,
  totalMonthlyFixed: number,
  securities: Security[],
  pensions: PensionConfig[],
  totalWealth: number,
  emergencyFundMonths: number,
  bonds: Bond[] = [],
  pacPlans: PACPlan[] = [],
): number {
  let score = 0

  // Savings rate (max 30)
  if (savingsRate >= 30) score += 30
  else if (savingsRate >= 20) score += 22
  else if (savingsRate >= 10) score += 14
  else if (savingsRate >= 5) score += 7
  else if (savingsRate > 0) score += 3

  // Fixed expense ratio (max 15)
  const fixedRatio = effectiveMonthlyIncome > 0 ? totalMonthlyFixed / effectiveMonthlyIncome : 1
  if (fixedRatio <= 0.3) score += 15
  else if (fixedRatio <= 0.4) score += 11
  else if (fixedRatio <= 0.5) score += 7
  else if (fixedRatio <= 0.6) score += 3

  // Portfolio diversification (max 15) — counts all investment positions across all asset classes
  const totalPositions = securities.length + bonds.length + pacPlans.length
  if (totalPositions >= 5) score += 15
  else if (totalPositions >= 3) score += 10
  else if (totalPositions >= 1) score += 5

  // Pension coverage (max 15)
  if (pensions.length > 0) {
    const coverage = getTotalPensionValue(pensions) / Math.max(1, totalWealth)
    if (coverage >= 0.2) score += 15
    else if (coverage >= 0.1) score += 10
    else score += 5
  }

  // Wealth ratio (max 10)
  const wealthRatio = effectiveMonthlyIncome > 0 ? totalWealth / (effectiveMonthlyIncome * 12) : 0
  if (wealthRatio >= 10) score += 10
  else if (wealthRatio >= 5) score += 7
  else if (wealthRatio >= 2) score += 4
  else if (wealthRatio >= 1) score += 2

  // Emergency fund (max 15): 6 months = ottimo, 12 months = PERFETTO
  if (emergencyFundMonths >= 12) score += 15
  else if (emergencyFundMonths >= 6) score += 13
  else if (emergencyFundMonths >= 3) score += 8
  else if (emergencyFundMonths >= 1) score += 4
  else if (emergencyFundMonths > 0) score += 2

  return Math.min(100, Math.round(score))
}

export function getFinancialAlerts(
  savingsRate: number,
  monthlyBalance: number,
  effectiveMonthlyIncome: number,
  totalMonthlyFixed: number,
  securities: Security[],
  pensions: PensionConfig[],
  emergencyFundMonths: number,
  emergencyFundMonthlyBase: number,
  bonds: Bond[] = [],
  pacPlans: PACPlan[] = [],
): string[] {
  const alerts: string[] = []
  if (monthlyBalance < 0) alerts.push('Le spese mensili superano il reddito. Bilancio negativo!')
  if (savingsRate < 10 && savingsRate >= 0) alerts.push('Tasso di risparmio sotto il 10%. Obiettivo consigliato: almeno il 20%.')
  const fixedRatio = effectiveMonthlyIncome > 0 ? (totalMonthlyFixed / effectiveMonthlyIncome) * 100 : 0
  if (fixedRatio > 50) alerts.push(`Spese fisse al ${fixedRatio.toFixed(0)}% del reddito (soglia consigliata: max 50%).`)
  const totalPositions = securities.length + bonds.length + pacPlans.length
  if (totalPositions === 0) alerts.push('Nessun investimento in portafoglio. Considera di iniziare ad investire.')
  else if (totalPositions < 3) alerts.push('Portafoglio poco diversificato. Considera di aggiungere altri strumenti.')
  if (pensions.length === 0) alerts.push('Nessun fondo pensione configurato. Valuta di iniziare a versare.')

  // Emergency fund alerts
  if (emergencyFundMonths < 6) {
    const target = emergencyFundMonthlyBase > 0
      ? ` (obiettivo: €${Math.round(emergencyFundMonthlyBase * 6).toLocaleString('it-IT')})`
      : ''
    if (emergencyFundMonths === 0) {
      alerts.push(`Nessun fondo di emergenza. Punta a 6 mesi di spese${target}.`)
    } else {
      alerts.push(`Fondo di emergenza insufficiente: ${emergencyFundMonths.toFixed(1)} mesi su 6${target}.`)
    }
  }

  return alerts
}

// ─── Reminder alerts ──────────────────────────────────────────────────────────

export function shouldShowVariableExpenseAlert(
  variableExpenses: VariableExpense[],
  enabled: boolean,
  dismissals: AlertDismissals,
): boolean {
  if (!enabled) return false
  const today = new Date()
  if (dismissals.variableExpenses === today.toISOString().split('T')[0]) return false
  const cutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  return !variableExpenses.some((e) => new Date(e.date) >= cutoff)
}

export function shouldShowLiquidityAlert(
  assets: Asset[],
  enabled: boolean,
  dismissals: AlertDismissals,
): boolean {
  if (!enabled) return false
  const today = new Date()
  const currentMonth = today.toISOString().slice(0, 7)
  if (dismissals.liquidity === currentMonth) return false
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const day = today.getDate()
  if (day < daysInMonth - 4 && day > 3) return false
  return assets.some((a) => a.type === 'liquidita')
}

// ─── AI cost estimate ─────────────────────────────────────────────────────────

const INPUT_PRICE_PER_TOKEN  = 3   / 1_000_000   // $3/MTok  — claude-sonnet-4-6
const OUTPUT_PRICE_PER_TOKEN = 15  / 1_000_000   // $15/MTok
const EUR_USD_RATE           = 0.92

export function estimateAdviceCostEur(
  securitiesCount: number,
  pensionsCount: number,
  fixedExpensesCount: number,
  assetsCount: number,
  pacCount: number,
): number {
  // Rough token estimate: base template + per-item entries
  const inputTokens  = 600 + securitiesCount * 40 + pensionsCount * 30
    + fixedExpensesCount * 20 + assetsCount * 20 + pacCount * 15
  const outputTokens = 1_600 // typical response

  const costUsd = inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN
  return costUsd * EUR_USD_RATE
}
