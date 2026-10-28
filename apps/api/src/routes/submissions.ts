import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { config } from '../config.js'
import { HttpError, asyncRoute } from '../http.js'
import {
  candidateApplicationSchema,
  contactMessageSchema,
  hiringRequestSchema,
} from '../schemas.js'
import { optionalAuth } from '../middleware.js'

export function createSubmissionRouter(prisma: PrismaClient) {
  const router = Router()
  const attachOptionalUser = optionalAuth(prisma)

  router.post(
    '/applications',
    attachOptionalUser,
    asyncRoute(async (request, response) => {
      if (!config.PUBLIC_SUBMISSIONS_ENABLED) {
        throw new HttpError(
          503,
          'SUBMISSIONS_NOT_CONFIGURED',
          'Applications are not open for online submission yet.',
        )
      }

      const input = candidateApplicationSchema.parse(request.body)
      if (request.authUser && request.authUser.role !== 'CANDIDATE') {
        throw new HttpError(
          403,
          'PERMISSION_DENIED',
          'Only candidate accounts can submit an application while signed in.',
        )
      }
      if (request.authUser) {
        const account = await prisma.user.findUnique({
          where: { id: request.authUser.id },
          select: { email: true },
        })
        if (!account || account.email !== input.email) {
          throw new HttpError(
            403,
            'ACCOUNT_EMAIL_MISMATCH',
            'Use the email address associated with your candidate account.',
          )
        }
      }

      const application = await prisma.candidateApplication.create({
        data: {
          userId: request.authUser?.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          city: input.city,
          educationLevel: input.educationLevel,
          currentSkills: input.currentSkills,
          roleInterest: input.roleInterest,
          remoteWorkReason: input.remoteWorkReason,
          privacyNoticeVersion: config.PRIVACY_NOTICE_VERSION,
        },
        select: { id: true, createdAt: true },
      })
      response.status(201).json({
        data: { id: application.id, receivedAt: application.createdAt },
      })
    }),
  )

  router.post(
    '/hiring-requests',
    attachOptionalUser,
    asyncRoute(async (request, response) => {
      if (!config.PUBLIC_SUBMISSIONS_ENABLED) {
        throw new HttpError(
          503,
          'SUBMISSIONS_NOT_CONFIGURED',
          'Hiring requests are not open for online submission yet.',
        )
      }

      const input = hiringRequestSchema.parse(request.body)
      if (request.authUser && request.authUser.role !== 'EMPLOYER') {
        throw new HttpError(
          403,
          'PERMISSION_DENIED',
          'Only employer accounts can submit a hiring request while signed in.',
        )
      }
      if (request.authUser) {
        const account = await prisma.user.findUnique({
          where: { id: request.authUser.id },
          select: { email: true },
        })
        if (!account || account.email !== input.contactEmail) {
          throw new HttpError(
            403,
            'ACCOUNT_EMAIL_MISMATCH',
            'Use the email address associated with your employer account.',
          )
        }
      }

      const requestRecord = await prisma.hiringRequest.create({
        data: {
          userId: request.authUser?.id,
          companyName: input.companyName,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          roleNeeded: input.roleNeeded,
          hireCount: input.hireCount,
          salaryMin: new Prisma.Decimal(input.salaryMin),
          salaryMax: new Prisma.Decimal(input.salaryMax),
          salaryCurrency: input.salaryCurrency,
          salaryPeriod: input.salaryPeriod,
          timeZone: input.timeZone,
          roleDetails: input.roleDetails || null,
          privacyNoticeVersion: config.PRIVACY_NOTICE_VERSION,
        },
        select: { id: true, createdAt: true },
      })
      response.status(201).json({
        data: { id: requestRecord.id, receivedAt: requestRecord.createdAt },
      })
    }),
  )

  router.post(
    '/contact',
    attachOptionalUser,
    asyncRoute(async (request, response) => {
      if (!config.PUBLIC_SUBMISSIONS_ENABLED) {
        throw new HttpError(
          503,
          'SUBMISSIONS_NOT_CONFIGURED',
          'Contact messages are not open for online submission yet.',
        )
      }

      const input = contactMessageSchema.parse(request.body)
      const message = await prisma.contactMessage.create({
        data: {
          userId: request.authUser?.id,
          name: input.name,
          email: input.email,
          subject: input.subject,
          message: input.message,
          privacyNoticeVersion: config.PRIVACY_NOTICE_VERSION,
        },
        select: { id: true, createdAt: true },
      })
      response.status(201).json({
        data: { id: message.id, receivedAt: message.createdAt },
      })
    }),
  )

  return router
}
