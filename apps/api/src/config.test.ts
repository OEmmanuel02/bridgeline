import { describe, expect, it } from 'vitest'
import { apiConfigSchema } from './config.js'

const validProductionConfig = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://service:secret@db.example.com:5432/bridgeline',
  JWT_SECRET: 'a-production-secret-with-at-least-thirty-two-characters',
  APP_ORIGINS: 'https://app.example.com',
  TRUST_PROXY_HOPS: '1',
  PUBLIC_SUBMISSIONS_ENABLED: 'false',
  PUBLIC_REGISTRATION_ENABLED: 'false',
  PRIVACY_NOTICE_VERSION: 'draft-1',
}

describe('API environment configuration', () => {
  it('accepts HTTPS production origins with an explicit proxy configuration', () => {
    const result = apiConfigSchema.safeParse(validProductionConfig)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.TRUST_PROXY_HOPS).toBe(1)
      expect(result.data.APP_ORIGINS).toBe('https://app.example.com')
    }
  })

  it('rejects production defaults that would break proxy or origin security', () => {
    expect(
      apiConfigSchema.safeParse({
        ...validProductionConfig,
        TRUST_PROXY_HOPS: '0',
      }).success,
    ).toBe(false)
    expect(
      apiConfigSchema.safeParse({
        ...validProductionConfig,
        APP_ORIGINS: 'http://app.example.com',
      }).success,
    ).toBe(false)
  })

  it('rejects wildcard or path-bearing origins and draft privacy with collection enabled', () => {
    expect(
      apiConfigSchema.safeParse({
        ...validProductionConfig,
        APP_ORIGINS: '*',
      }).success,
    ).toBe(false)
    expect(
      apiConfigSchema.safeParse({
        ...validProductionConfig,
        APP_ORIGINS: 'https://app.example.com/path',
      }).success,
    ).toBe(false)
    expect(
      apiConfigSchema.safeParse({
        ...validProductionConfig,
        PUBLIC_SUBMISSIONS_ENABLED: 'true',
      }).success,
    ).toBe(false)
  })
})
