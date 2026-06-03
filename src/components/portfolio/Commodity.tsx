import { useApp } from '../../context/AppContext'
import { SecuritiesSection } from './SecuritiesSection'

export function Commodity() {
  const { state } = useApp()
  const commodities = state.securities.filter((s) => s.type === 'commodity')

  return (
    <SecuritiesSection
      securities={commodities}
      defaultType="commodity"
      emptyMessage="Nessuna commodity. Aggiungi oro, argento, petrolio o altri ETC."
    />
  )
}
