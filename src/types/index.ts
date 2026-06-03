// Current data model version — bump when shape changes
export const STATE_VERSION = 8

export type SecurityType = 'stock' | 'etf' | 'commodity' | 'crypto'

export interface Security {
  id: string
  symbol: string
  name: string
  type: SecurityType
  quantity: number
  purchasePrice: number
  purchaseDate: string
  ter?: number
  taxRate: number
  commissions: number
  currentPrice?: number
  currentChange?: number
  currentChangePercent?: number
  lastUpdated?: string
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  category: FixedExpenseCategory
  startDate: string
  endDate?: string
  notes?: string
}

export type FixedExpenseCategory =
  | 'affitto' | 'mutuo' | 'utenze' | 'abbonamenti'
  | 'assicurazioni' | 'trasporti' | 'istruzione' | 'altro'

export interface VariableExpense {
  id: string
  description: string
  amount: number
  category: VariableExpenseCategory
  date: string
  importHash?: string
}

export type VariableExpenseCategory =
  | 'alimentari' | 'ristoranti' | 'abbigliamento' | 'salute'
  | 'intrattenimento' | 'viaggi' | 'trasporti' | 'casa' | 'tecnologia' | 'utenze' | 'banca' | 'altro'

export interface VariableIncome {
  id: string
  description: string
  amount: number
  category: VariableIncomeCategory
  date: string
  importHash?: string
}

export type VariableIncomeCategory =
  | 'freelance' | 'bonus' | 'dividendi' | 'affitto'
  | 'vendita' | 'rimborso' | 'regalo' | 'banca' | 'altro'

export interface Asset {
  id: string
  name: string
  type: AssetType
  value: number
  yearlyIncome?: number
  purchaseDate?: string
  notes?: string
  sqm?: number               // m² (immobile only)
  depreciationRate?: number  // annual % (veicolo only, default 15)
}

export type AssetType = 'immobile' | 'veicolo' | 'liquidita' | 'fondo_emergenza' | 'altro'

export interface VoluntaryPayment {
  id: string
  date: string
  amount: number
  notes?: string
}

export interface PensionConfig {
  id: string
  provider: string
  currentValue: number
  monthlyContribution: number          // fixed EUR or 0 when contributionType='percent'
  employerContribution: number
  contributionType?: 'fixed' | 'percent'
  contributionPercent?: number         // % of effective monthly income
  voluntaryContribution?: number       // legacy: monthly amount, superseded by voluntaryPayments
  voluntaryPayments?: VoluntaryPayment[]
  currentAge: number
  retirementAge: number
  expectedReturn: number
  notes?: string
}

export interface PACPlan {
  id: string
  symbol: string
  name: string
  monthlyAmount: number
  startDate: string
  endDate?: string
  active: boolean
  ter?: number
  notes?: string
  purchases: PACPurchase[]
  taxRate: number
  currentPrice?: number
}

export interface PACPurchase {
  id: string
  date: string
  price: number
  quantity: number
  amount: number
  commission: number
}

export interface Bond {
  id: string
  name: string
  isin?: string
  issuer: string
  faceValue: number       // Valore nominale unitario (es. 1000 €)
  quantity: number        // Numero di titoli
  purchasePrice: number   // Prezzo acquisto in % del nominale (es. 98.5)
  couponRate: number      // Tasso cedolare annuo (%)
  maturityDate: string    // Data scadenza (YYYY-MM-DD)
  purchaseDate: string    // Data acquisto (YYYY-MM-DD)
  taxRate: number         // Aliquota: 12.5 (gov) o 26 (corporate)
  currentPrice?: number   // Prezzo corrente in % del nominale (opzionale)
  notes?: string
}

export interface AlertDismissals {
  variableExpenses?: string
  liquidity?: string
}

export interface AppSettings {
  monthlyIncome: number            // Stipendio base mensile (per mensilità)
  salaryInstallments: 12 | 13 | 14 // Numero di mensilità
  expectedReturn: number
  riskProfile: 'conservativo' | 'moderato' | 'aggressivo'
  claudeApiKey: string
  currency: string
  alertVariableExpenses: boolean
  alertLiquidity: boolean
  privacyMode: boolean
}

export interface WealthSnapshot {
  date: string
  total: number
  portfolio: number
  assets: number
  pension: number
}

export interface AppState {
  _version: number
  securities: Security[]
  fixedExpenses: FixedExpense[]
  variableExpenses: VariableExpense[]
  variableIncomes: VariableIncome[]
  assets: Asset[]
  pensions: PensionConfig[]
  pacPlans: PACPlan[]
  bonds: Bond[]
  settings: AppSettings
  wealthHistory: WealthSnapshot[]
  alertDismissals: AlertDismissals
}
