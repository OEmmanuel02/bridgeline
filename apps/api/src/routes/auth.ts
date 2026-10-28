import { compare, hash } from 'bcryptjs'
import { Router, type Response } from 'express'
import {
  refreshCookieName,
  hashRefreshToken,
  createRefreshToken,
  createSessionFamilyId,
  createAccessToken,
  refreshTokenExpiry,
} from '../authTokens.js'
import { HttpError, asyncRoute } from '../http.js'
import { config } from '../config.js'
import type { PrismaClient } from '@prisma/client'
import {
  candidateRegistrationSchema,
  employerRegistrationSchema,
  loginSchema,
} from '../schemas.js'
import { requireAuth } from '../middleware.js'

const bcryptRounds = 12
const dummyPasswordHash = hash('bridgeline-invalid-password', bcryptRounds)

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
  }
}

function setRefreshCookie(response: Response, token: string) {
  response.cookie(refreshCookieName, token, {
    ...refreshCookieOptions(),
    expires: refreshTokenExpiry(),
  })
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookieName, refreshCookieOptions())
}

function sendUnauthenticated(response: Response) {
  clearRefreshCookie(response)
  response.json({ data: { authenticated: false } })
}

async function createRefreshSession(
  prisma: PrismaClient,
  userId: string,
  familyId: string = createSessionFamilyId(),
) {
  const token = createRefreshToken()
  await prisma.refreshSession.create({
    data: {
      userId,
      familyId,
      tokenHash: hashRefreshToken(token),
      expiresAt: refreshTokenExpiry(),
    },
  })
  return token
}

async function sessionResponse(
  prisma: PrismaClient,
  response: Response,
  user: { id: string; email: string; fullName: string; role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' },
  familyId?: string,
) {
  const refreshToken = await createRefreshSession(prisma, user.id, familyId)
  setRefreshCookie(response, refreshToken)
  const accessToken = await createAccessToken({ id: user.id, role: user.role })
  response.json({
    data: {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: config.ACCESS_TOKEN_TTL_SECONDS,
      user,
    },
  })
}

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router()

  router.post(
    '/register/candidate',
    asyncRoute(async (request, response) => {
      if (!config.PUBLIC_REGISTRATION_ENABLED) {
        throw new HttpError(
          503,
          'REGISTRATION_NOT_CONFIGURED',
          'Online account registration is not open yet.',
        )
      }
      const input = candidateRegistrationSchema.parse(request.body)
      const passwordHash = await hash(input.password, bcryptRounds)
      const user = await prisma.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordHash,
          role: 'CANDIDATE',
          privacyNoticeVersion: config.PRIVACY_NOTICE_VERSION,
          candidateProfile: { create: {} },
        },
        select: { id: true, email: true, fullName: true, role: true },
      })
      response.status(201)
      await sessionResponse(prisma, response, user)
    }),
  )

  router.post(
    '/register/employer',
    asyncRoute(async (request, response) => {
      if (!config.PUBLIC_REGISTRATION_ENABLED) {
        throw new HttpError(
          503,
          'REGISTRATION_NOT_CONFIGURED',
          'Online account registration is not open yet.',
        )
      }
      const input = employerRegistrationSchema.parse(request.body)
      const passwordHash = await hash(input.password, bcryptRounds)
      const user = await prisma.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordHash,
          role: 'EMPLOYER',
          privacyNoticeVersion: config.PRIVACY_NOTICE_VERSION,
          employerProfile: { create: { companyName: input.companyName } },
        },
        select: { id: true, email: true, fullName: true, role: true },
      })
      response.status(201)
      await sessionResponse(prisma, response, user)
    }),
  )

  router.post(
    '/login',
    asyncRoute(async (request, response) => {
      const input = loginSchema.parse(request.body)
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, fullName: true, role: true, passwordHash: true },
      })
      const passwordHash = user?.passwordHash ?? (await dummyPasswordHash)
      const passwordMatches = await compare(input.password, passwordHash)
      if (!user || !passwordMatches) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
      }

      const { passwordHash: _passwordHash, ...publicUser } = user
      await sessionResponse(prisma, response, publicUser)
    }),
  )

  router.post(
    '/refresh',
    asyncRoute(async (request, response) => {
      const token = request.cookies?.[refreshCookieName]
      if (typeof token !== 'string') {
        sendUnauthenticated(response)
        return
      }

      const tokenHash = hashRefreshToken(token)
      const session = await prisma.refreshSession.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, email: true, fullName: true, role: true } } },
      })
      if (!session) {
        sendUnauthenticated(response)
        return
      }
      if (session.revokedAt) {
        await prisma.refreshSession.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        sendUnauthenticated(response)
        return
      }
      if (session.expiresAt <= new Date()) {
        await prisma.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        })
        sendUnauthenticated(response)
        return
      }

      const nextToken = createRefreshToken()
      const rotated = await prisma.$transaction(async (transaction) => {
        const revoked = await transaction.refreshSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        if (revoked.count !== 1) {
          await transaction.refreshSession.updateMany({
            where: { familyId: session.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
          return false
        }
        await transaction.refreshSession.create({
          data: {
            userId: session.userId,
            familyId: session.familyId,
            tokenHash: hashRefreshToken(nextToken),
            expiresAt: refreshTokenExpiry(),
          },
        })
        return true
      })
      if (!rotated) {
        sendUnauthenticated(response)
        return
      }

      setRefreshCookie(response, nextToken)
      const accessToken = await createAccessToken({
        id: session.user.id,
        role: session.user.role,
      })
      response.json({
        data: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: config.ACCESS_TOKEN_TTL_SECONDS,
          user: session.user,
        },
      })
    }),
  )

  router.post(
    '/logout',
    asyncRoute(async (request, response) => {
      const token = request.cookies?.[refreshCookieName]
      if (typeof token === 'string') {
        await prisma.refreshSession.updateMany({
          where: { tokenHash: hashRefreshToken(token), revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      clearRefreshCookie(response)
      response.status(204).end()
    }),
  )

  router.get(
    '/me',
    requireAuth(prisma),
    asyncRoute(async (request, response) => {
      const user = await prisma.user.findUnique({
        where: { id: request.authUser!.id },
        select: { id: true, email: true, fullName: true, role: true },
      })
      if (!user) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }
      response.json({ data: { user } })
    }),
  )

  return router
}
