import { useState } from 'react'
import { InvestmentReport } from './InvestmentReport'
import { Bonds } from './Bonds'
import { Stocks } from './Stocks'
import { Etf } from './Etf'
import { Commodity } from './Commodity'
import { Crypto } from './Crypto'

type Tab = 'rendiconto' | 'titoli' | 'etf' | 'bonds' | 'commodity' | 'crypto'

const TABS: { key: Tab; label: string }[] = [
  { key: 'rendiconto', label: 'Rendiconto'   },
  { key: 'titoli',     label: 'Titoli'       },
  { key: 'etf',        label: 'ETF & PAC'    },
  { key: 'bonds',      label: 'Obbligazioni' },
  { key: 'commodity',  label: 'Commodities'  },
  { key: 'crypto',     label: 'Crypto'       },
]

export function Portfolio() {
  const [tab, setTab] = useState<Tab>('rendiconto')

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              tab === key
                ? 'bg-accent/15 text-accent-light border border-accent/20'
                : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rendiconto' && <InvestmentReport />}
      {tab === 'titoli'     && <Stocks />}
      {tab === 'etf'        && <Etf />}
      {tab === 'bonds'      && <Bonds />}
      {tab === 'commodity'  && <Commodity />}
      {tab === 'crypto'     && <Crypto />}
    </div>
  )
}
