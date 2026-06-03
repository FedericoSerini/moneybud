import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../lib/keycloak', () => ({
  default: {
    token: 'test-token',
    tokenParsed: { sub: 'user-123' },
    logout: vi.fn(),
    updateToken: vi.fn().mockResolvedValue(false),
  },
}))

function Consumer() {
  const { token, userId } = useAuth()
  return <div data-testid="out">{token}:{userId}</div>
}

describe('AuthContext', () => {
  it('provides token and userId from keycloak', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('out').textContent).toBe('test-token:user-123')
  })
})
