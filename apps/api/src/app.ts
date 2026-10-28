import cors from 'cors'
import cookieParser from 'cookie-parser'
import { Router } from 'express'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import type { PrismaClient } from '@prisma/client'
import { config } from './config.js'
import { asyncRoute, errorHandler, HttpError } from './http.js'
import { requireOrigin } from './middleware.js'
import { createAuthRouter } from './routes/auth.js'
import { createSubmissionRouter } from './routes/submissions.js'
import {
  createCandidateDashboardRouter,
  createEmployerDashboardRouter,
} from './routes/dashboards.js'
import { createAdminRouter } from './routes/admin.js'

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    })
  },
})

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' },
    })
  },
})

const publicFormRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many submissions. Try again later.' },
    })
  },
})

export function createApp(prisma: PrismaClient) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.TRUST_PROXY_HOPS)
  app.use(
    helmet({
      hsts: config.NODE_ENV === 'production' ? undefined : false,
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'connect-src': ["'self'", ...config.APP_ORIGINS],
        },
      },
    }),
  )
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.APP_ORIGINS.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This request origin is not allowed.'))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  )
  app.use(express.json({ limit: '32kb', strict: true }))
  app.use(cookieParser())
  app.use(requireOrigin(config.APP_ORIGINS))
  app.use(apiRateLimit)

  app.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok' } })
  })

  app.get(
    '/ready',
    asyncRoute(async (_request, response) => {
      try {
        await prisma.$queryRaw`SELECT 1`
        response.json({ data: { status: 'ready' } })
      } catch (error) {
        console.error('API readiness check failed', {
          name: error instanceof Error ? error.name : 'UnknownError',
        })
        response.status(503).json({
          error: { code: 'DATABASE_NOT_READY', message: 'The service is not ready.' },
        })
      }
    }),
  )

  const apiRouter = Router()
  apiRouter.use('/auth/login', authRateLimit)
  apiRouter.use('/auth/register', authRateLimit)
  apiRouter.use('/auth/refresh', authRateLimit)
  apiRouter.use('/auth', createAuthRouter(prisma))
  apiRouter.use('/forms', publicFormRateLimit, createSubmissionRouter(prisma))
  apiRouter.use('/candidate', createCandidateDashboardRouter(prisma))
  apiRouter.use('/employer', createEmployerDashboardRouter(prisma))
  apiRouter.use('/admin', createAdminRouter(prisma))
  app.use('/api/v1', apiRouter)
  app.use((_request, _response, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found.'))
  })
  app.use(errorHandler)
  return app
}
