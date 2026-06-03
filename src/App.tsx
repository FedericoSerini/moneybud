import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { Portfolio } from './components/portfolio/Portfolio'
import { Expenses } from './components/expenses/Expenses'
import { Assets } from './components/assets/Assets'
import { Pension } from './components/pension/Pension'
import { FinancialAdvice } from './components/advice/FinancialAdvice'
import { Settings } from './components/settings/Settings'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/spese" element={<Expenses />} />
                    <Route path="/asset" element={<Assets />} />
                    <Route path="/pensione" element={<Pension />} />
                    <Route path="/consigli" element={<FinancialAdvice />} />
                    <Route path="/impostazioni" element={<Settings />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
