import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { asyncRoute } from '../http.js'
import { requireAuth, requireRole } from '../middleware.js'
import {
  candidateProfilePatchSchema,
  candidateVisibilitySchema,
  employerProfilePatchSchema,
} from '../schemas.js'

export function createCandidateDashboardRouter(prisma: PrismaClient) {
  const router = Router()
  router.use(requireAuth(prisma), requireRole('CANDIDATE'))

  router.get(
    '/me',
    asyncRoute(async (request, response) => {
      const userId = request.authUser!.id
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          candidateProfile: {
            select: {
              phone: true,
              city: true,
              educationLevel: true,
              currentSkills: true,
              roleInterest: true,
              employerVisibilityConsentAt: true,
            },
          },
          applications: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              roleInterest: true,
              status: true,
              createdAt: true,
              trainingProgress: { select: { percentage: true, status: true } },
              assessment: { select: { status: true, score: true, completedAt: true } },
              employerMatches: {
                orderBy: { authorizedAt: 'desc' },
                select: {
                  authorizedAt: true,
                  hiringRequest: {
                    select: { companyName: true, roleNeeded: true, status: true },
                  },
                },
              },
              placement: {
                select: {
                  placedAt: true,
                  hiringRequest: { select: { companyName: true, roleNeeded: true } },
                },
              },
            },
          },
        },
      })
      response.json({ data: user })
    }),
  )

  router.patch(
    '/me/profile',
    asyncRoute(async (request, response) => {
      const input = candidateProfilePatchSchema.parse(request.body)
      const userId = request.authUser!.id
      const { fullName, ...profile } = input
      const updated = await prisma.$transaction(async (transaction) => {
        if (fullName !== undefined) {
          await transaction.user.update({ where: { id: userId }, data: { fullName } })
        }
        if (Object.keys(profile).length > 0) {
          await transaction.candidateProfile.update({
            where: { userId },
            data: profile,
          })
        }
        await transaction.auditLog.create({
          data: {
            actorId: userId,
            action: 'CANDIDATE_PROFILE_UPDATED',
            entityType: 'CandidateProfile',
            entityId: userId,
            details: { fields: Object.keys(input) },
          },
        })
        return transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, fullName: true, candidateProfile: true },
        })
      })
      response.json({ data: updated })
    }),
  )

  router.patch(
    '/me/visibility',
    asyncRoute(async (request, response) => {
      const { consent } = candidateVisibilitySchema.parse(request.body)
      const userId = request.authUser!.id
      const profile = await prisma.candidateProfile.findUniqueOrThrow({
        where: { userId },
        select: { employerVisibilityConsentAt: true },
      })
      const nextConsentAt = consent
        ? (profile.employerVisibilityConsentAt ?? new Date())
        : null
      const changed =
        (profile.employerVisibilityConsentAt === null) !== (nextConsentAt === null)

      if (changed) {
        await prisma.$transaction([
          prisma.candidateProfile.update({
            where: { userId },
            data: { employerVisibilityConsentAt: nextConsentAt },
          }),
          prisma.auditLog.create({
            data: {
              actorId: userId,
              action: consent ? 'CANDIDATE_VISIBILITY_CONSENT_GRANTED' : 'CANDIDATE_VISIBILITY_CONSENT_REVOKED',
              entityType: 'CandidateProfile',
              entityId: userId,
              details: { consent },
            },
          }),
        ])
      }

      response.json({ data: { consent, updatedAt: nextConsentAt } })
    }),
  )

  return router
}

export function createEmployerDashboardRouter(prisma: PrismaClient) {
  const router = Router()
  router.use(requireAuth(prisma), requireRole('EMPLOYER'))

  router.get(
    '/me',
    asyncRoute(async (request, response) => {
      const data = await prisma.user.findUniqueOrThrow({
        where: { id: request.authUser!.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          employerProfile: { select: { companyName: true } },
          hiringRequests: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              companyName: true,
              roleNeeded: true,
              hireCount: true,
              salaryMin: true,
              salaryMax: true,
              salaryCurrency: true,
              salaryPeriod: true,
              status: true,
              createdAt: true,
              _count: { select: { employerMatches: true, placements: true } },
            },
          },
        },
      })
      response.json({ data })
    }),
  )

  router.patch(
    '/me/profile',
    asyncRoute(async (request, response) => {
      const input = employerProfilePatchSchema.parse(request.body)
      const userId = request.authUser!.id
      const updated = await prisma.$transaction(async (transaction) => {
        if (input.fullName !== undefined) {
          await transaction.user.update({
            where: { id: userId },
            data: { fullName: input.fullName },
          })
        }
        if (input.companyName !== undefined) {
          await transaction.employerProfile.update({
            where: { userId },
            data: { companyName: input.companyName },
          })
        }
        await transaction.auditLog.create({
          data: {
            actorId: userId,
            action: 'EMPLOYER_PROFILE_UPDATED',
            entityType: 'EmployerProfile',
            entityId: userId,
            details: { fields: Object.keys(input) },
          },
        })
        return transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, fullName: true, employerProfile: true },
        })
      })
      response.json({ data: updated })
    }),
  )

  router.get(
    '/me/matches',
    asyncRoute(async (request, response) => {
      const matches = await prisma.candidateEmployerMatch.findMany({
        where: {
          hiringRequest: { userId: request.authUser!.id },
          candidateApplication: {
            userId: { not: null },
            user: { candidateProfile: { employerVisibilityConsentAt: { not: null } } },
          },
        },
        orderBy: { authorizedAt: 'desc' },
        select: {
          id: true,
          authorizedAt: true,
          hiringRequest: {
            select: { id: true, companyName: true, roleNeeded: true },
          },
          candidateApplication: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              city: true,
              educationLevel: true,
              currentSkills: true,
              roleInterest: true,
              user: {
                select: {
                  fullName: true,
                  email: true,
                  candidateProfile: {
                    select: {
                      phone: true,
                      city: true,
                      educationLevel: true,
                      currentSkills: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      response.json({ data: matches })
    }),
  )

  return router
}
