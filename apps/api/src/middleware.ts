import type { NextFunction, Request, Response } from 'express'
import type { PrismaClient, UserRole } from '@prisma/client'
import { HttpError } from './http.js'
import { verifyAccessToken } from './authTokens.js'

export function requireOrigin(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins)
  return (request: Request, _response: Response, next: NextFunction) => {
    const origin = request.get('origin')
    if (origin && !allowed.has(origin)) {
      next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This request origin is not allowed.'))
      return
    }
    next()
  }
}

export function requireAuth(prisma: PrismaClient) {
  return (request: Request, _response: Response, next: NextFunction) => {
    void (async () => {
      const header = request.get('authorization')
      if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
      }

      const tokenUser = await verifyAccessToken(header.slice('Bearer '.length))
      if (!tokenUser) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }

      const user = await prisma.user.findUnique({
        where: { id: tokenUser.id },
        select: { id: true, role: true },
      })
      if (!user || user.role !== tokenUser.role) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }
      request.authUser = user
      next()
    })().catch(next)
  }
}

export function optionalAuth(prisma: PrismaClient) {
  return (request: Request, _response: Response, next: NextFunction) => {
    void (async () => {
      const header = request.get('authorization')
      if (!header) {
        next()
        return
      }
      if (!header.startsWith('Bearer ')) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }

      const tokenUser = await verifyAccessToken(header.slice('Bearer '.length))
      if (!tokenUser) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }
      const user = await prisma.user.findUnique({
        where: { id: tokenUser.id },
        select: { id: true, role: true },
      })
      if (!user || user.role !== tokenUser.role) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Sign in to continue.')
      }
      request.authUser = user
      next()
    })().catch(next)
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'))
      return
    }
    if (!roles.includes(request.authUser.role)) {
      next(new HttpError(403, 'PERMISSION_DENIED', 'You do not have permission to do this.'))
      return
    }
    next()
  }
}
