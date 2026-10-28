import cookieParser from 'cookie-parser'
import express from 'express'
import type { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { hashRefreshToken } from '../authTokens.js'
import { errorHandler } from '../http.js'
import { createAuthRouter } from './auth.js'

function createAuthApp(user: unknown) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
    },
    refreshSession: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient
  const app = express()
  app.use(express.json())
  app.use('/auth', createAuthRouter(prisma))
  app.use(errorHandler)
  return app
}

function createRefreshApp(prisma: PrismaClient) {
  const app = express()
  app.use(cookieParser())
  app.use('/auth', createAuthRouter(prisma))
  app.use(errorHandler)
  return app
}

describe('authentication routes', () => {
  it('issues a short-lived access token and HttpOnly refresh cookie without exposing the hash', async () => {
    const passwordHash = await hash('a-valid-test-password', 4)
    const app = createAuthApp({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'ada@example.com',
      fullName: 'Ada Okafor',
      role: 'CANDIDATE',
      passwordHash,
    })

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'ADA@example.com', password: 'a-valid-test-password' })
      .expect(200)

    expect(response.body.data.accessToken).toBeTruthy()
    expect(response.body.data.expiresIn).toBeLessThanOrEqual(900)
    expect(response.body.data.user).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'ada@example.com',
      fullName: 'Ada Okafor',
      role: 'CANDIDATE',
    })
    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Strict')
    expect(response.headers['set-cookie'][0]).toContain('/api/v1/auth')
  })

  it('uses the same credential error for an unknown email and a bad password', async () => {
    const app = createAuthApp(null)
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'a-valid-test-password' })
      .expect(401)

    expect(response.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    })
  })

  it('rotates a valid refresh token and persists only its hash', async () => {
    const session = {
      id: 'session-id',
      userId: '00000000-0000-4000-8000-000000000001',
      familyId: 'family-id',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'ada@example.com',
        fullName: 'Ada Okafor',
        role: 'CANDIDATE',
      },
    }
    const transaction = {
      refreshSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({}),
      },
    }
    const prisma = {
      refreshSession: { findUnique: vi.fn().mockResolvedValue(session) },
      $transaction: vi.fn(
        async (callback: (value: typeof transaction) => Promise<boolean>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient

    const response = await request(createRefreshApp(prisma))
      .post('/auth/refresh')
      .set('Cookie', 'bridgeline_refresh=previous-refresh-token')
      .expect(200)
    const cookie = response.headers['set-cookie']?.[0]
    if (!cookie) throw new Error('The rotated refresh cookie was not set.')
    const rotatedToken = cookie.match(/bridgeline_refresh=([^;]+)/)?.[1]
    if (!rotatedToken) throw new Error('The rotated refresh cookie had no token.')

    expect(response.body.data.accessToken).toBeTruthy()
    expect(response.body.data.user).toEqual(session.user)
    expect(transaction.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: hashRefreshToken(rotatedToken),
        familyId: 'family-id',
      }),
    })
    expect(transaction.refreshSession.create.mock.calls[0][0].data.tokenHash).not.toBe(rotatedToken)
  })

  it('revokes the remaining session family when refresh rotation loses a concurrent race', async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
    const transaction = {
      refreshSession: {
        updateMany,
        create: vi.fn(),
      },
    }
    const prisma = {
      refreshSession: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'session-id',
          userId: '00000000-0000-4000-8000-000000000001',
          familyId: 'family-id',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'ada@example.com',
            fullName: 'Ada Okafor',
            role: 'CANDIDATE',
          },
        }),
      },
      $transaction: vi.fn(
        async (callback: (value: typeof transaction) => Promise<boolean>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient
    const response = await request(createRefreshApp(prisma))
      .post('/auth/refresh')
      .set('Cookie', 'bridgeline_refresh=concurrently-used-token')
      .expect(200)

    expect(response.body).toEqual({ data: { authenticated: false } })
    expect(updateMany).toHaveBeenCalledTimes(2)
    expect(updateMany.mock.calls[1][0]).toMatchObject({
      where: { familyId: 'family-id', revokedAt: null },
    })
  })
})
