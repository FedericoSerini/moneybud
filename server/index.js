import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { encode, decode } from 'cbor-x'
import { compress, decompress } from '@mongodb-js/zstd'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MOBILE_DB_URL = process.env.MOBILE_DB_URL ?? 'http://localhost:8443'

function hlcToCbor(hlc) {
  return { w: BigInt(hlc.w ?? 0), l: hlc.l ?? 0, d: hlc.d ?? '' }
}

function hlcToJson(hlc) {
  return { w: (hlc.w ?? 0n).toString(), l: hlc.l ?? 0, d: hlc.d ?? '' }
}

function jsonBodyToCbor(msg) {
  return {
    ...msg,
    clock: hlcToCbor(msg.clock),
    ops: (msg.ops ?? []).map(op => ({ ...op, ts: hlcToCbor(op.ts) })),
  }
}

function cborResponseToJson(resp) {
  return {
    ...resp,
    new_clock: hlcToJson(resp.new_clock),
    ops: (resp.ops ?? []).map(op => ({ ...op, ts: hlcToJson(op.ts) })),
  }
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Yahoo Finance proxy for stock quotes
app.get('/api/stocks/:symbol', async (req, res) => {
  const { symbol } = req.params
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` })
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]

    if (!result) {
      return res.status(404).json({ error: `No data for symbol ${symbol}` })
    }

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice ?? meta.previousClose
    const previousClose = meta.chartPreviousClose ?? meta.previousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    res.json({
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || symbol,
      price: currentPrice,
      change,
      changePercent,
      currency: meta.currency,
      marketState: meta.marketState,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err.message)
    res.status(500).json({ error: 'Failed to fetch stock data' })
  }
})

// Yahoo Finance historical data for charts
app.get('/api/stocks/:symbol/history', async (req, res) => {
  const { symbol } = req.params
  const { range = '1y', interval = '1wk' } = req.query
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` })
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    if (!result) return res.status(404).json({ error: 'No data' })

    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []

    const history = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i],
      }))
      .filter((d) => d.close != null)

    res.json(history)
  } catch (err) {
    console.error(`Error fetching history for ${symbol}:`, err.message)
    res.status(500).json({ error: 'Failed to fetch historical data' })
  }
})

// Claude AI financial advice
app.post('/api/advice', async (req, res) => {
  const { apiKey, financialData } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' })
  }

  const client = new Anthropic({ apiKey })

  const { portfolio, assets, fixedExpenses, variableExpenses, variableIncomes = [], pensions = [], pacPlans = [], settings } = financialData

  const effectiveMonthlyIncome = (settings.monthlyIncome * (settings.salaryInstallments || 12)) / 12
  const totalPortfolioValue = portfolio.reduce((sum, s) => sum + (s.quantity * (s.currentPrice || s.purchasePrice)), 0)
  const totalAssetValue = assets.reduce((sum, a) => sum + a.value, 0)
  const totalAnnualAssetIncome = assets.reduce((sum, a) => sum + (a.yearlyIncome || 0), 0)
  const totalPensionValue = pensions.reduce((sum, p) => sum + p.currentValue, 0)
  const totalMonthlyPensionContrib = pensions.reduce((sum, p) => sum + p.monthlyContribution + p.employerContribution, 0)
  // Only count active fixed expenses (no endDate or endDate in future)
  const now = new Date()
  const activeFixed = fixedExpenses.filter((e) => !e.endDate || new Date(e.endDate) >= new Date(now.getFullYear(), now.getMonth(), 1))
  const totalMonthlyFixed = activeFixed.reduce((sum, e) => sum + e.amount, 0)
  const currentMonthExpenses = variableExpenses
    .filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, e) => sum + e.amount, 0)
  const currentMonthExtraIncome = variableIncomes
    .filter((i) => { const d = new Date(i.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((sum, i) => sum + i.amount, 0)
  const totalWealth = totalPortfolioValue + totalAssetValue + totalPensionValue
  const monthlyBalance = effectiveMonthlyIncome + currentMonthExtraIncome - totalMonthlyFixed - currentMonthExpenses

  // Emergency fund calculations
  const emergencyFundValue = assets.filter((a) => a.type === 'fondo_emergenza').reduce((sum, a) => sum + a.value, 0)
  const alimentariMonths = (() => {
    let total = 0, count = 0
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = variableExpenses
        .filter((e) => { const ed = new Date(e.date); return e.category === 'alimentari' && ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() })
        .reduce((s, e) => s + e.amount, 0)
      if (m > 0) { total += m; count++ }
    }
    return count > 0 ? total / count : 0
  })()
  const emergencyFundBase = totalMonthlyFixed + alimentariMonths
  const emergencyFundMonths = emergencyFundBase > 0 ? emergencyFundValue / emergencyFundBase : 0
  const emergencyFundStatus = emergencyFundMonths >= 12 ? 'PERFETTO (≥12 mesi)' : emergencyFundMonths >= 6 ? 'Ottimo (≥6 mesi)' : emergencyFundMonths > 0 ? `Insufficiente (${emergencyFundMonths.toFixed(1)} mesi)` : 'Assente'

  const prompt = `Sei un consulente finanziario esperto. Analizza la situazione finanziaria seguente e fornisci consigli pratici e specifici in italiano.

SITUAZIONE FINANZIARIA:
- Reddito mensile base: €${settings.monthlyIncome.toLocaleString('it-IT')} × ${settings.salaryInstallments || 12} mensilità = €${effectiveMonthlyIncome.toLocaleString('it-IT', { maximumFractionDigits: 0 })}/mese effettivo
- Patrimonio totale: €${totalWealth.toLocaleString('it-IT')}
- Entrate variabili (mese corrente): €${currentMonthExtraIncome.toLocaleString('it-IT')}
- Portafoglio titoli: €${totalPortfolioValue.toLocaleString('it-IT')} (${portfolio.length} posizioni)
- PAC attivi: ${pacPlans.filter((p) => p.active).length} piani (€${pacPlans.filter((p) => p.active).reduce((s, p) => s + p.monthlyAmount, 0).toLocaleString('it-IT')}/mese)
- Asset fisici: €${totalAssetValue.toLocaleString('it-IT')}
- Rendita annua da asset: €${totalAnnualAssetIncome.toLocaleString('it-IT')}
- Fondi pensione: ${pensions.length} (valore totale €${totalPensionValue.toLocaleString('it-IT')}, contributo €${totalMonthlyPensionContrib.toLocaleString('it-IT')}/mese)
- Spese fisse mensili (attive): €${totalMonthlyFixed.toLocaleString('it-IT')}
- Spese variabili (mese corrente): €${currentMonthExpenses.toLocaleString('it-IT')}
- Bilancio mensile netto: €${monthlyBalance.toLocaleString('it-IT')}
- Profilo di rischio: ${settings.riskProfile}
- Rendimento atteso annuo: ${settings.expectedReturn}%

FONDO DI EMERGENZA:
- Valore attuale: €${emergencyFundValue.toLocaleString('it-IT')}
- Base mensile (spese fisse + media alimentari): €${Math.round(emergencyFundBase).toLocaleString('it-IT')}
- Media mensile alimentari (ultimi 6 mesi): €${Math.round(alimentariMonths).toLocaleString('it-IT')}
- Copertura attuale: ${emergencyFundMonths.toFixed(1)} mesi → ${emergencyFundStatus}
- Obiettivo minimo (6 mesi / ottimo): €${Math.round(emergencyFundBase * 6).toLocaleString('it-IT')}
- Obiettivo ideale (12 mesi / perfetto): €${Math.round(emergencyFundBase * 12).toLocaleString('it-IT')}

PORTAFOGLIO DETTAGLIO:
${portfolio.map((s) => `- ${s.symbol} (${s.name}): ${s.quantity} quote @ €${s.purchasePrice} → attuale €${(s.currentPrice || s.purchasePrice).toFixed(2)}${s.ter ? `, TER ${s.ter}%` : ''}`).join('\n') || 'Nessun titolo'}

PIANI PAC:
${pacPlans.map((p) => `- ${p.symbol}: €${p.monthlyAmount}/mese${p.active ? ' (attivo)' : ' (sospeso)'}`).join('\n') || 'Nessun PAC'}

FONDI PENSIONE:
${pensions.map((p) => `- ${p.provider}: valore €${p.currentValue.toLocaleString('it-IT')}, contributo €${(p.monthlyContribution + p.employerContribution).toLocaleString('it-IT')}/mese, pensione a ${p.retirementAge} anni`).join('\n') || 'Nessun fondo pensione'}

SPESE FISSE ATTIVE:
${activeFixed.map((e) => `- ${e.name}: €${e.amount}/mese (${e.category})`).join('\n') || 'Nessuna spesa fissa'}

ASSET FISICI:
${assets.map((a) => `- ${a.name} (${a.type === 'fondo_emergenza' ? 'Fondo Emergenza' : a.type}): €${a.value.toLocaleString('it-IT')}${a.yearlyIncome ? `, rendita €${a.yearlyIncome}/anno` : ''}`).join('\n') || 'Nessun asset'}

Fornisci una risposta strutturata con:
1. **Score di salute finanziaria** (0-100) con spiegazione dettagliata
2. **Punti di forza** (massimo 3, concreti)
3. **Aree di miglioramento** (massimo 4, con consigli specifici e azionabili usando i numeri reali)
4. **Alerts urgenti** (problemi da risolvere subito)
5. **Suggerimento principale** per migliorare il patrimonio nel breve termine

Sii diretto, pratico e specifico. Usa sempre i numeri reali dell'utente.

⚠️ IMPORTANTE: Includi sempre il disclaimer che questi sono suggerimenti informativi e NON costituiscono consulenza finanziaria professionale regolamentata ai sensi del D.Lgs. 58/1998.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    res.json({ advice: message.content[0].text })
  } catch (err) {
    console.error('Claude API error:', err.message)
    if (err.status === 401) {
      return res.status(401).json({ error: 'API key non valida' })
    }
    res.status(500).json({ error: 'Errore nella generazione dei consigli' })
  }
})

app.post('/api/sync/register', async (req, res) => {
  try {
    const upstream = await fetch(`${MOBILE_DB_URL}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('sync/register error:', err.message)
    res.status(500).json({ error: 'device registration failed' })
  }
})

app.post('/api/sync/token', async (req, res) => {
  try {
    const upstream = await fetch(`${MOBILE_DB_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('sync/token error:', err.message)
    res.status(500).json({ error: 'token exchange failed' })
  }
})

app.post('/api/sync', async (req, res) => {
  const deviceKeyId = req.headers['x-device-key-id']
  const deviceSecret = req.headers['x-device-secret']
  if (!deviceKeyId || !deviceSecret) {
    return res.status(401).json({ error: 'missing device credentials' })
  }

  try {
    const cborPayload = jsonBodyToCbor(req.body)
    const cborEncoded = Buffer.from(encode(cborPayload))
    const compressed = await compress(cborEncoded)

    const upstream = await fetch(`${MOBILE_DB_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor+zstd',
        'X-Device-Key': `${deviceKeyId}:${deviceSecret}`,
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: compressed,
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: await upstream.text() })
    }

    const responseBuffer = Buffer.from(await upstream.arrayBuffer())
    const decompressed = await decompress(responseBuffer)
    const decoded = decode(decompressed)

    res.json(cborResponseToJson(decoded))
  } catch (err) {
    console.error('sync error:', err.message)
    res.status(500).json({ error: 'sync failed' })
  }
})

app.get('/api/sync/events', async (req, res) => {
  const { token, device_key_id, device_secret } = req.query
  if (!token || !device_key_id || !device_secret) {
    return res.status(401).send('missing credentials')
  }

  let upstream
  try {
    upstream = await fetch(`${MOBILE_DB_URL}/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Device-Key': `${device_key_id}:${device_secret}`,
      },
    })
  } catch {
    return res.status(502).send('upstream unreachable')
  }

  if (!upstream.ok) {
    return res.status(upstream.status).send('upstream error')
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()

  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
    } catch {
      // client disconnected
    } finally {
      res.end()
    }
  }

  pump()
  req.on('close', () => reader.cancel())
})

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Moneybud server running on http://localhost:${PORT}`)
})
