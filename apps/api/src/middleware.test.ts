import express, { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createAccessToken } from './authTokens.js'
import { errorHandler } from './http.js'
import { requireAuth, requireRole } from './middleware.js'

function createAuthorizationApp(databaseRole: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' = 'CANDIDATE') {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        role: databaseRole,
      }),
    },
  } as unknown as PrismaClient
  const router = Router()
  router.get(
    '/candidate',
    requireAuth(prisma),
    requireRole('CANDIDATE'),
    (_request, response) => response.json({ data: { allowed: true } }),
  )
  router.get(
    '/admin',
    requireAuth(prisma),
    requireRole('ADMIN'),
    (_request, response) => response.json({ data: { allowed: true } }),
  )
  const app = express()
  app.use('/private', router)
  app.use(errorHandler)
  return { app, prisma }
}

describe('authentication and role middleware', () => {
  it('accepts a valid signed-in candidate for candidate access', async () => {
    const { app } = createAuthorizationApp()
    const token = await createAccessToken({
      id: '00000000-0000-4000-8000-000000000001',
      role: 'CANDIDATE',
    })
    const response = await request(app)
      .get('/private/candidate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.data.allowed).toBe(true)
  })

  it('forbids candidates from administrator-only endpoints', async () => {
    const { app } = createAuthorizationApp()
    const token = await createAccessToken({
      id: '00000000-0000-4000-8000-000000000001',
      role: 'CANDIDATE',
    })
    const response = await request(app)
      .get('/private/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.error.code).toBe('PERMISSION_DENIED')
  })

  it('rejects invalid and stale-role access tokens', async () => {
    const { app } = createAuthorizationApp('EMPLOYER')
    const invalidResponse = await request(app)
      .get('/private/candidate')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
    expect(invalidResponse.body.error.code).toBe('INVALID_CREDENTIALS')

    const staleRoleToken = await createAccessToken({
      id: '00000000-0000-4000-8000-000000000001',
      role: 'CANDIDATE',
    })
    const staleResponse = await request(app)
      .get('/private/candidate')
      .set('Authorization', `Bearer ${staleRoleToken}`)
      .expect(401)
    expect(staleResponse.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})
