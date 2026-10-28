import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { config } from './config.js'
import { verifyAccessToken } from './authTokens.js'

const signingKey = new TextEncoder().encode(config.JWT_SECRET)

async function createToken({
  algorithm = 'HS256',
  issuer = 'bridgeline-api',
  audience = 'bridgeline-web',
  expiration = '1h',
}: {
  algorithm?: 'HS256' | 'HS384'
  issuer?: string
  audience?: string
  expiration?: string
} = {}) {
  return new SignJWT({ role: 'CANDIDATE' })
    .setProtectedHeader({ alg: algorithm })
    .setSubject('00000000-0000-4000-8000-000000000001')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(signingKey)
}

describe('access token verification', () => {
  it('accepts a token signed with the configured algorithm and claims', async () => {
    await expect(verifyAccessToken(await createToken())).resolves.toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      role: 'CANDIDATE',
    })
  })

  it('rejects expired tokens and incorrect issuer or audience claims', async () => {
    await expect(verifyAccessToken(await createToken({ expiration: '0s' }))).resolves.toBeNull()
    await expect(verifyAccessToken(await createToken({ issuer: 'other-api' }))).resolves.toBeNull()
    await expect(verifyAccessToken(await createToken({ audience: 'other-client' }))).resolves.toBeNull()
  })

  it('rejects validly signed tokens that use an unexpected algorithm', async () => {
    await expect(verifyAccessToken(await createToken({ algorithm: 'HS384' }))).resolves.toBeNull()
  })
})
