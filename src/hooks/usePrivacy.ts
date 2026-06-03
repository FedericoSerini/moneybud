import { useApp } from '../context/AppContext'
import { formatCurrency } from '../utils/format'

export function usePrivacy() {
  const { state, updateSettings } = useApp()
  const privacyMode = state.settings.privacyMode ?? false

  const fmt = (value: number, currency?: string): string =>
    privacyMode ? '••••' : formatCurrency(value, currency)

  const toggle = () => updateSettings({ privacyMode: !privacyMode })

  return { privacyMode, fmt, toggle }
}
