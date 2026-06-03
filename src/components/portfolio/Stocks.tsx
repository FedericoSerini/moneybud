import { useApp } from '../../context/AppContext'
import { SecuritiesSection } from './SecuritiesSection'

export function Stocks() {
  const { state } = useApp()
  const stocks = state.securities.filter((s) => s.type === 'stock')

  return (
    <SecuritiesSection
      securities={stocks}
      defaultType="stock"
      emptyMessage="Nessun titolo. Aggiungi la prima posizione azionaria."
    />
  )
}
