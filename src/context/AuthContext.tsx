import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import keycloak from '../lib/keycloak'

interface AuthState {
  token: string
  userId: string
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(keycloak.token ?? '')
  const userId = keycloak.tokenParsed?.sub ?? ''

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(60)
        if (refreshed) setToken(keycloak.token ?? '')
      } catch {
        keycloak.logout()
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const logout = useCallback(() => keycloak.logout(), [])

  return (
    <AuthContext.Provider value={{ token, userId, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
