import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  AppState, AppSettings, Security, FixedExpense, VariableExpense, VariableIncome,
  Asset, PensionConfig, PACPlan, PACPurchase, Bond, AlertDismissals, STATE_VERSION,
  VoluntaryPayment,
} from '../types'
import { SyncEngine, type CRDTOp, type MergeOpsFn } from '../lib/sync'
import { useAuth } from './AuthContext'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  monthlyIncome: 0,
  salaryInstallments: 12,
  expectedReturn: 7,
  riskProfile: 'moderato',
  claudeApiKey: '',
  currency: 'EUR',
  alertVariableExpenses: true,
  alertLiquidity: true,
  privacyMode: false,
}

const DEFAULT_STATE: AppState = {
  _version: STATE_VERSION,
  securities: [],
  fixedExpenses: [],
  variableExpenses: [],
  variableIncomes: [],
  assets: [],
  pensions: [],
  pacPlans: [],
  bonds: [],
  settings: DEFAULT_SETTINGS,
  wealthHistory: [],
  alertDismissals: {},
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState
  addBond: (b: Omit<Bond, 'id'>) => void
  updateBond: (id: string, b: Partial<Bond>) => void
  deleteBond: (id: string) => void
  addSecurity: (s: Omit<Security, 'id'>) => void
  updateSecurity: (id: string, s: Partial<Security>) => void
  deleteSecurity: (id: string) => void
  updateSecurityPrice: (id: string, price: number, change: number, changePercent: number) => void
  addFixedExpense: (e: Omit<FixedExpense, 'id'>) => void
  updateFixedExpense: (id: string, e: Partial<FixedExpense>) => void
  deleteFixedExpense: (id: string) => void
  reorderFixedExpenses: (items: FixedExpense[]) => void
  addVariableExpense: (e: Omit<VariableExpense, 'id'>) => void
  updateVariableExpense: (id: string, e: Partial<VariableExpense>) => void
  deleteVariableExpense: (id: string) => void
  reorderVariableExpenses: (items: VariableExpense[]) => void
  addVariableIncome: (i: Omit<VariableIncome, 'id'>) => void
  updateVariableIncome: (id: string, i: Partial<VariableIncome>) => void
  deleteVariableIncome: (id: string) => void
  reorderVariableIncomes: (items: VariableIncome[]) => void
  addAsset: (a: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, a: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  addPension: (p: Omit<PensionConfig, 'id'>) => void
  updatePension: (id: string, p: Partial<PensionConfig>) => void
  deletePension: (id: string) => void
  addVoluntaryPensionPayment: (pensionId: string, payment: Omit<VoluntaryPayment, 'id'>) => void
  deleteVoluntaryPensionPayment: (pensionId: string, paymentId: string) => void
  addPACPlan: (p: Omit<PACPlan, 'id' | 'purchases'>) => void
  updatePACPlan: (id: string, p: Partial<PACPlan>) => void
  deletePACPlan: (id: string) => void
  addPACPurchase: (planId: string, purchase: Omit<PACPurchase, 'id'>) => void
  deletePACPurchase: (planId: string, purchaseId: string) => void
  updateSettings: (s: Partial<AppSettings>) => void
  dismissAlert: (type: keyof AlertDismissals) => void
  recordWealthSnapshot: (portfolio: number, assets: number, pension: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)

  const { token, userId } = useAuth()
  const engineRef = useRef<SyncEngine | null>(null)
  const isInitializedRef = useRef(false)
  const isMergingRef = useRef(false)
  const prevStateRef = useRef<AppState>(DEFAULT_STATE)

  const SYNC_FIELDS = [
    'securities', 'fixedExpenses', 'variableExpenses', 'variableIncomes',
    'assets', 'pensions', 'pacPlans', 'bonds', 'settings', 'wealthHistory', 'alertDismissals',
  ] as const

  type SyncField = (typeof SYNC_FIELDS)[number]

  const mergeRemoteOps = useCallback<MergeOpsFn>((ops: CRDTOp[]) => {
    isMergingRef.current = true
    setState(prev => {
      let next = prev
      for (const op of ops) {
        if ((SYNC_FIELDS as readonly string[]).includes(op.field)) {
          next = { ...next, [op.field]: op.value }
        }
      }
      // If nothing changed, React won't re-render — reset flag here so op-push
      // effect doesn't stay blocked on the next unrelated state change.
      if (next === prev) isMergingRef.current = false
      return next
    })
  }, [])

  useEffect(() => {
    if (!token || !userId) return
    const engine = new SyncEngine()
    engineRef.current = engine

    engine
      .init(token, userId, mergeRemoteOps)
      .then(snapshot => {
        isMergingRef.current = true
        setState(prev => {
          let next = prev
          for (const op of snapshot.ops) {
            if ((SYNC_FIELDS as readonly string[]).includes(op.field)) {
              next = { ...next, [op.field]: op.value }
            }
          }
          if (snapshot.snapshot) {
            next = { ...DEFAULT_STATE, ...(snapshot.snapshot as Partial<AppState>) }
          }
          return next
        })
        isInitializedRef.current = true
        prevStateRef.current = state
      })
      .catch(console.error)

    return () => {
      engine.destroy()
      engineRef.current = null
      isInitializedRef.current = false
    }
  }, [token, userId, mergeRemoteOps])

  useEffect(() => {
    if (!isInitializedRef.current) return
    if (isMergingRef.current) {
      isMergingRef.current = false
      prevStateRef.current = state
      return
    }
    const prev = prevStateRef.current
    prevStateRef.current = state

    for (const field of SYNC_FIELDS) {
      if (state[field] !== prev[field]) {
        engineRef.current?.push({
          op_id: crypto.randomUUID(),
          field,
          value: state[field],
        })
      }
    }
  }, [state])

  const addBond = useCallback((b: Omit<Bond, 'id'>) => {
    setState((p) => ({ ...p, bonds: [...p.bonds, { ...b, id: uuidv4() }] }))
  }, [])
  const updateBond = useCallback((id: string, b: Partial<Bond>) => {
    setState((p) => ({ ...p, bonds: p.bonds.map((bond) => bond.id === id ? { ...bond, ...b } : bond) }))
  }, [])
  const deleteBond = useCallback((id: string) => {
    setState((p) => ({ ...p, bonds: p.bonds.filter((b) => b.id !== id) }))
  }, [])

  const addSecurity = useCallback((s: Omit<Security, 'id'>) => {
    setState((p) => {
      const existing = p.securities.find((sec) => sec.symbol === s.symbol && sec.type === s.type)
      if (existing) {
        const totalQty = existing.quantity + s.quantity
        const avgPrice = (existing.quantity * existing.purchasePrice + s.quantity * s.purchasePrice) / totalQty
        return {
          ...p,
          securities: p.securities.map((sec) =>
            sec.id === existing.id
              ? {
                  ...sec,
                  quantity: totalQty,
                  purchasePrice: avgPrice,
                  commissions: (sec.commissions ?? 0) + (s.commissions ?? 0),
                  purchaseDate: sec.purchaseDate <= s.purchaseDate ? sec.purchaseDate : s.purchaseDate,
                }
              : sec,
          ),
        }
      }
      return { ...p, securities: [...p.securities, { ...s, id: uuidv4() }] }
    })
  }, [])
  const updateSecurity = useCallback((id: string, s: Partial<Security>) => {
    setState((p) => ({ ...p, securities: p.securities.map((sec) => sec.id === id ? { ...sec, ...s } : sec) }))
  }, [])
  const deleteSecurity = useCallback((id: string) => {
    setState((p) => ({ ...p, securities: p.securities.filter((s) => s.id !== id) }))
  }, [])
  const updateSecurityPrice = useCallback((id: string, price: number, change: number, changePercent: number) => {
    setState((p) => ({
      ...p,
      securities: p.securities.map((s) =>
        s.id === id ? { ...s, currentPrice: price, currentChange: change, currentChangePercent: changePercent, lastUpdated: new Date().toISOString() } : s,
      ),
    }))
  }, [])

  const addFixedExpense = useCallback((e: Omit<FixedExpense, 'id'>) => {
    setState((p) => ({ ...p, fixedExpenses: [...p.fixedExpenses, { ...e, id: uuidv4() }] }))
  }, [])
  const updateFixedExpense = useCallback((id: string, e: Partial<FixedExpense>) => {
    setState((p) => ({ ...p, fixedExpenses: p.fixedExpenses.map((ex) => ex.id === id ? { ...ex, ...e } : ex) }))
  }, [])
  const deleteFixedExpense = useCallback((id: string) => {
    setState((p) => ({ ...p, fixedExpenses: p.fixedExpenses.filter((e) => e.id !== id) }))
  }, [])
  const reorderFixedExpenses = useCallback((items: FixedExpense[]) => {
    setState((p) => ({ ...p, fixedExpenses: items }))
  }, [])

  const addVariableExpense = useCallback((e: Omit<VariableExpense, 'id'>) => {
    setState((p) => ({ ...p, variableExpenses: [...p.variableExpenses, { ...e, id: uuidv4() }] }))
  }, [])
  const updateVariableExpense = useCallback((id: string, e: Partial<VariableExpense>) => {
    setState((p) => ({ ...p, variableExpenses: p.variableExpenses.map((ex) => ex.id === id ? { ...ex, ...e } : ex) }))
  }, [])
  const deleteVariableExpense = useCallback((id: string) => {
    setState((p) => ({ ...p, variableExpenses: p.variableExpenses.filter((e) => e.id !== id) }))
  }, [])
  const reorderVariableExpenses = useCallback((items: VariableExpense[]) => {
    setState((p) => ({ ...p, variableExpenses: items }))
  }, [])

  const addVariableIncome = useCallback((i: Omit<VariableIncome, 'id'>) => {
    setState((p) => ({ ...p, variableIncomes: [...p.variableIncomes, { ...i, id: uuidv4() }] }))
  }, [])
  const updateVariableIncome = useCallback((id: string, i: Partial<VariableIncome>) => {
    setState((p) => ({ ...p, variableIncomes: p.variableIncomes.map((inc) => inc.id === id ? { ...inc, ...i } : inc) }))
  }, [])
  const deleteVariableIncome = useCallback((id: string) => {
    setState((p) => ({ ...p, variableIncomes: p.variableIncomes.filter((i) => i.id !== id) }))
  }, [])
  const reorderVariableIncomes = useCallback((items: VariableIncome[]) => {
    setState((p) => ({ ...p, variableIncomes: items }))
  }, [])

  const addAsset = useCallback((a: Omit<Asset, 'id'>) => {
    setState((p) => ({ ...p, assets: [...p.assets, { ...a, id: uuidv4() }] }))
  }, [])
  const updateAsset = useCallback((id: string, a: Partial<Asset>) => {
    setState((p) => ({ ...p, assets: p.assets.map((asset) => asset.id === id ? { ...asset, ...a } : asset) }))
  }, [])
  const deleteAsset = useCallback((id: string) => {
    setState((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== id) }))
  }, [])

  const addPension = useCallback((p: Omit<PensionConfig, 'id'>) => {
    setState((prev) => ({ ...prev, pensions: [...prev.pensions, { ...p, id: uuidv4() }] }))
  }, [])
  const updatePension = useCallback((id: string, p: Partial<PensionConfig>) => {
    setState((prev) => ({ ...prev, pensions: prev.pensions.map((pen) => pen.id === id ? { ...pen, ...p } : pen) }))
  }, [])
  const deletePension = useCallback((id: string) => {
    setState((p) => ({ ...p, pensions: p.pensions.filter((pen) => pen.id !== id) }))
  }, [])
  const addVoluntaryPensionPayment = useCallback((pensionId: string, payment: Omit<VoluntaryPayment, 'id'>) => {
    setState((prev) => ({
      ...prev,
      pensions: prev.pensions.map((pen) =>
        pen.id === pensionId
          ? { ...pen, voluntaryPayments: [...(pen.voluntaryPayments ?? []), { ...payment, id: uuidv4() }] }
          : pen,
      ),
    }))
  }, [])
  const deleteVoluntaryPensionPayment = useCallback((pensionId: string, paymentId: string) => {
    setState((prev) => ({
      ...prev,
      pensions: prev.pensions.map((pen) =>
        pen.id === pensionId
          ? { ...pen, voluntaryPayments: (pen.voluntaryPayments ?? []).filter((p) => p.id !== paymentId) }
          : pen,
      ),
    }))
  }, [])

  const addPACPlan = useCallback((p: Omit<PACPlan, 'id' | 'purchases'>) => {
    setState((prev) => ({ ...prev, pacPlans: [...prev.pacPlans, { ...p, id: uuidv4(), purchases: [] }] }))
  }, [])
  const updatePACPlan = useCallback((id: string, p: Partial<PACPlan>) => {
    setState((prev) => ({ ...prev, pacPlans: prev.pacPlans.map((plan) => plan.id === id ? { ...plan, ...p } : plan) }))
  }, [])
  const deletePACPlan = useCallback((id: string) => {
    setState((p) => ({ ...p, pacPlans: p.pacPlans.filter((plan) => plan.id !== id) }))
  }, [])
  const addPACPurchase = useCallback((planId: string, purchase: Omit<PACPurchase, 'id'>) => {
    setState((prev) => ({
      ...prev,
      pacPlans: prev.pacPlans.map((plan) =>
        plan.id === planId
          ? { ...plan, purchases: [...plan.purchases, { ...purchase, id: uuidv4() }], currentPrice: purchase.price }
          : plan,
      ),
    }))
  }, [])
  const deletePACPurchase = useCallback((planId: string, purchaseId: string) => {
    setState((prev) => ({
      ...prev,
      pacPlans: prev.pacPlans.map((plan) =>
        plan.id === planId ? { ...plan, purchases: plan.purchases.filter((p) => p.id !== purchaseId) } : plan,
      ),
    }))
  }, [])

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setState((p) => ({ ...p, settings: { ...p.settings, ...s } }))
  }, [])

  const dismissAlert = useCallback((type: keyof AlertDismissals) => {
    const value = type === 'liquidity'
      ? new Date().toISOString().slice(0, 7)
      : new Date().toISOString().split('T')[0]
    setState((p) => ({ ...p, alertDismissals: { ...p.alertDismissals, [type]: value } }))
  }, [])

  const recordWealthSnapshot = useCallback((portfolio: number, assets: number, pension: number) => {
    const today = new Date().toISOString().split('T')[0]
    const snapshot = { date: today, total: portfolio + assets + pension, portfolio, assets, pension }
    setState((p) => {
      const history = p.wealthHistory.filter((h) => h.date !== today)
      return { ...p, wealthHistory: [...history, snapshot].slice(-365) }
    })
  }, [])

  return (
    <AppContext.Provider value={{
      state,
      addBond, updateBond, deleteBond,
      addSecurity, updateSecurity, deleteSecurity, updateSecurityPrice,
      addFixedExpense, updateFixedExpense, deleteFixedExpense, reorderFixedExpenses,
      addVariableExpense, updateVariableExpense, deleteVariableExpense, reorderVariableExpenses,
      addVariableIncome, updateVariableIncome, deleteVariableIncome, reorderVariableIncomes,
      addAsset, updateAsset, deleteAsset,
      addPension, updatePension, deletePension, addVoluntaryPensionPayment, deleteVoluntaryPensionPayment,
      addPACPlan, updatePACPlan, deletePACPlan, addPACPurchase, deletePACPurchase,
      updateSettings,
      dismissAlert,
      recordWealthSnapshot,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
