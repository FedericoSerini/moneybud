import { describe, it, expect, vi } from 'vitest'

vi.mock('keycloak-js', () => ({
  default: vi.fn().mockImplementation((config: unknown) => ({ _config: config })),
}))

describe('keycloak singleton', () => {
  it('is configured with master realm and moneybud clientId', async () => {
    const { default: keycloak } = await import('./keycloak')
    expect((keycloak as any)._config.realm).toBe('master')
    expect((keycloak as any)._config.clientId).toBe('moneybud')
  })
})
