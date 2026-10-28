import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { config } from './config.js'
import { createApp } from './app.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
})
const app = createApp(prisma)

describe('API boundary', () => {
  it('returns a health response without exposing configuration', async () => {
    const response = await request(app).get('/health').expect(200)
    expect(response.body).toEqual({ data: { status: 'ok' } })
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL')
  })

  it('reports database readiness without exposing connection details', async () => {
    const readyPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaClient
    const response = await request(createApp(readyPrisma)).get('/ready').expect(200)
    expect(response.body).toEqual({ data: { status: 'ready' } })
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL')
  })

  it('returns a safe not-ready status when PostgreSQL is unreachable', async () => {
    const failedPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('private database connection detail')),
    } as unknown as PrismaClient
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await request(createApp(failedPrisma)).get('/ready').expect(503)
      expect(response.body).toEqual({
        error: { code: 'DATABASE_NOT_READY', message: 'The service is not ready.' },
      })
      expect(JSON.stringify(response.body)).not.toContain('private database connection detail')
      expect(logError).toHaveBeenCalledWith('API readiness check failed', {
        name: 'Error',
      })
    } finally {
      logError.mockRestore()
    }
  })

  it('rejects unapproved browser origins', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://untrusted.example')
      .send({ email: 'user@example.com', password: 'password' })
      .expect(403)

    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED')
  })

  it('does not accept public application submissions until enabled', async () => {
    const response = await request(app)
      .post('/api/v1/forms/applications')
      .set('Origin', 'http://localhost:5173')
      .send({})
      .expect(503)

    expect(response.body.error.code).toBe('SUBMISSIONS_NOT_CONFIGURED')
  })

  it('does not allow public registrations until privacy review is complete', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register/candidate')
      .set('Origin', 'http://localhost:5173')
      .send({
        fullName: 'Ada Okafor',
        email: 'ada@example.com',
        password: 'a-long-test-password',
        privacyConsent: true,
      })
      .expect(503)

    expect(response.body.error.code).toBe('REGISTRATION_NOT_CONFIGURED')
  })

  it('requires authentication for the current-account endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', 'http://localhost:5173')
      .expect(401)

    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('treats a missing refresh cookie as an unauthenticated session, not a server error', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .expect(200)

    expect(response.body).toEqual({ data: { authenticated: false } })
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('rejects malformed JSON with a safe client error', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400)

    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('rate-limits repeated refresh attempts', async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        request(app)
          .post('/api/v1/auth/refresh')
          .set('Origin', 'http://localhost:5173'),
      ),
    )

    expect(responses.some((response) => response.status === 429)).toBe(true)
    expect(responses.some((response) => response.body.error?.code === 'RATE_LIMITED')).toBe(true)
  })
})
