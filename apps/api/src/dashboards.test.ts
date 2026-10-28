import type { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createAccessToken } from './authTokens.js'
import { config } from './config.js'
import { createApp } from './app.js'

function testApp(role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN') {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        role,
      }),
    },
  } as unknown as PrismaClient
  return createApp(prisma)
}

async function tokenFor(role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN') {
  return createAccessToken({
    id: '00000000-0000-4000-8000-000000000001',
    role,
  })
}

describe('dashboard API role boundaries', () => {
  it('rejects unauthenticated candidate and employer dashboard requests', async () => {
    const app = testApp('CANDIDATE')
    const candidateResponse = await request(app)
      .get('/api/v1/candidate/me')
      .set('Origin', config.APP_ORIGINS[0])
      .expect(401)
    const employerResponse = await request(app)
      .get('/api/v1/employer/me')
      .set('Origin', config.APP_ORIGINS[0])
      .expect(401)

    expect(candidateResponse.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    expect(employerResponse.body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('prevents an employer from reading candidate data and a candidate from admin routes', async () => {
    const employerApp = testApp('EMPLOYER')
    const employerToken = await tokenFor('EMPLOYER')
    const candidateData = await request(employerApp)
      .get('/api/v1/candidate/me')
      .set('Origin', config.APP_ORIGINS[0])
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(403)

    const candidateApp = testApp('CANDIDATE')
    const candidateToken = await tokenFor('CANDIDATE')
    const adminData = await request(candidateApp)
      .get('/api/v1/admin/applications')
      .set('Origin', config.APP_ORIGINS[0])
      .set('Authorization', `Bearer ${candidateToken}`)
      .expect(403)

    expect(candidateData.body.error.code).toBe('PERMISSION_DENIED')
    expect(adminData.body.error.code).toBe('PERMISSION_DENIED')
  })

  it('rejects a token when the account role has changed since token issuance', async () => {
    const app = testApp('ADMIN')
    const formerCandidateToken = await tokenFor('CANDIDATE')
    const response = await request(app)
      .get('/api/v1/admin/applications')
      .set('Origin', config.APP_ORIGINS[0])
      .set('Authorization', `Bearer ${formerCandidateToken}`)
      .expect(401)

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})
