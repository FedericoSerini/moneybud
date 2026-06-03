import { useApp } from '../../context/AppContext'
import { SecuritiesSection } from './SecuritiesSection'

export function Crypto() {
  const { state } = useApp()
  const cryptos = state.securities.filter((s) => s.type === 'crypto')

  return (
    <SecuritiesSection
      securities={cryptos}
      defaultType="crypto"
      emptyMessage="Nessuna crypto. Aggiungi Bitcoin, Ethereum o altre criptovalute."
    />
  )
}
