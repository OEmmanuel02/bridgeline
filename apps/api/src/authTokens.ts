import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { config } from './config.js'
import type { AuthenticatedUser } from './types.js'

const jwtSecret = new TextEncoder().encode(config.JWT_SECRET)
const tokenIssuer = 'bridgeline-api'
const tokenAudience = 'bridgeline-web'

export const refreshCookieName = 'bridgeline_refresh'

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createRefreshToken() {
  return randomBytes(48).toString('base64url')
}

export function createSessionFamilyId() {
  return randomUUID()
}

export async function createAccessToken(user: AuthenticatedUser) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(jwtSecret)
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: tokenIssuer,
      audience: tokenAudience,
    })
    if (typeof payload.sub !== 'string') {
      return null
    }

    if (payload.role === 'CANDIDATE') return { id: payload.sub, role: 'CANDIDATE' }
    if (payload.role === 'EMPLOYER') return { id: payload.sub, role: 'EMPLOYER' }
    if (payload.role === 'ADMIN') return { id: payload.sub, role: 'ADMIN' }
    return null
  } catch {
    return null
  }
}

export function refreshTokenExpiry() {
  return new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
}
