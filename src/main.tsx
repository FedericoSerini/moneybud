import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import keycloak from './lib/keycloak'

keycloak
  .init({ onLoad: 'login-required', pkceMethod: 'S256' })
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error('Keycloak init failed:', err)
    document.getElementById('root')!.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif;color:#ef4444">Authentication service unavailable. Please try again later.</div>'
  })
