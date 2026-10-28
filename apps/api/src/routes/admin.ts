import { Router } from 'express'
import type { ApplicationStatus, HiringRequestStatus, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { asyncRoute, HttpError } from '../http.js'
import { requireAuth, requireRole } from '../middleware.js'
import {
  applicationListQuerySchema,
  applicationStatusSchema,
  assessmentResultSchema,
  createMatchSchema,
  createPlacementSchema,
  hiringRequestListQuerySchema,
  hiringRequestStatusSchema,
  trainingProgressSchema,
} from '../schemas.js'
import { canTransitionApplication, canTransitionHiringRequest } from '../workflow.js'

function routeId(value: string | string[] | undefined) {
  return z.uuid().parse(typeof value === 'string' ? value : '')
}

export function createAdminRouter(prisma: PrismaClient) {
  const router = Router()
  router.use(requireAuth(prisma), requireRole('ADMIN'))

  router.get(
    '/applications',
    asyncRoute(async (request, response) => {
      const { status } = applicationListQuerySchema.parse(request.query)
      const applications = await prisma.candidateApplication.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          educationLevel: true,
          currentSkills: true,
          remoteWorkReason: true,
          roleInterest: true,
          status: true,
          internalReviewNote: true,
          createdAt: true,
          trainingProgress: { select: { percentage: true, status: true } },
          assessment: { select: { status: true, score: true } },
          _count: { select: { employerMatches: true } },
          employerMatches: {
            select: {
              id: true,
              hiringRequestId: true,
              hiringRequest: { select: { companyName: true } },
            },
          },
        },
      })
      response.json({ data: applications })
    }),
  )

  router.get(
    '/applications/:id',
    asyncRoute(async (request, response) => {
      const id = routeId(request.params.id)
      const application = await prisma.candidateApplication.findUnique({
        where: { id },
        include: {
          trainingProgress: true,
          assessment: true,
          employerMatches: {
            select: { id: true, authorizedAt: true, hiringRequest: { select: { id: true, companyName: true } } },
          },
          placement: { select: { id: true, placedAt: true, hiringRequest: { select: { companyName: true } } } },
        },
      })
      if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
      response.json({ data: application })
    }),
  )

  router.patch(
    '/applications/:id/status',
    asyncRoute(async (request, response) => {
      const id = routeId(request.params.id)
      const input = applicationStatusSchema.parse(request.body)
      const actorId = request.authUser!.id
      const current = await prisma.candidateApplication.findUnique({
        where: { id },
        select: { status: true },
      })
      if (!current) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
      if (
        !canTransitionApplication(
          current.status as ApplicationStatus,
          input.status as ApplicationStatus,
        )
      ) {
        throw new HttpError(409, 'INVALID_STATUS_TRANSITION', 'This application cannot move to that status.')
      }

      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.candidateApplication.updateMany({
          where: { id, status: current.status },
          data: {
            status: input.status,
            reviewedAt: new Date(),
            reviewedById: actorId,
            ...(input.internalReviewNote === undefined
              ? {}
              : { internalReviewNote: input.internalReviewNote }),
          },
        })
        if (updated.count !== 1) {
          throw new HttpError(409, 'STATUS_CHANGED', 'The application changed. Refresh and try again.')
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'APPLICATION_STATUS_CHANGED',
            entityType: 'CandidateApplication',
            entityId: id,
            details: { from: current.status, to: input.status },
          },
        })
      })
      response.json({ data: { id, status: input.status } })
    }),
  )

  router.patch(
    '/applications/:id/training',
    asyncRoute(async (request, response) => {
      const id = routeId(request.params.id)
      const input = trainingProgressSchema.parse(request.body)
      const actorId = request.authUser!.id
      const application = await prisma.candidateApplication.findUnique({
        where: { id },
        select: { status: true },
      })
      if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
      if (application.status !== 'IN_TRAINING') {
        throw new HttpError(409, 'TRAINING_NOT_AVAILABLE', 'Training updates are only available during training.')
      }

      const trainingStatus =
        input.percentage === 100
          ? 'COMPLETED'
          : input.percentage === 0
            ? 'NOT_STARTED'
            : 'IN_PROGRESS'

      await prisma.$transaction(async (transaction) => {
        const stillTraining = await transaction.candidateApplication.updateMany({
          where: { id, status: 'IN_TRAINING' },
          data: input.percentage === 100 ? { status: 'ASSESSMENT' } : {},
        })
        if (stillTraining.count !== 1) {
          throw new HttpError(409, 'STATUS_CHANGED', 'The application changed. Refresh and try again.')
        }
        await transaction.trainingProgress.upsert({
          where: { applicationId: id },
          create: {
            applicationId: id,
            percentage: input.percentage,
            status: trainingStatus,
            internalNote: input.internalNote,
            updatedById: actorId,
          },
          update: {
            percentage: input.percentage,
            status: trainingStatus,
            ...(input.internalNote === undefined ? {} : { internalNote: input.internalNote }),
            updatedById: actorId,
          },
        })
        if (input.percentage === 100) {
          await transaction.assessment.upsert({
            where: { applicationId: id },
            create: { applicationId: id },
            update: {},
          })
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'TRAINING_PROGRESS_UPDATED',
            entityType: 'CandidateApplication',
            entityId: id,
            details: {
              percentage: input.percentage,
              ...(input.percentage === 100 ? { advancedTo: 'ASSESSMENT' } : {}),
            },
          },
        })
      })
      response.json({
        data: {
          id,
          percentage: input.percentage,
          status: trainingStatus,
          applicationStatus: input.percentage === 100 ? 'ASSESSMENT' : 'IN_TRAINING',
        },
      })
    }),
  )

  router.patch(
    '/applications/:id/assessment',
    asyncRoute(async (request, response) => {
      const id = routeId(request.params.id)
      const input = assessmentResultSchema.parse(request.body)
      const actorId = request.authUser!.id
      const application = await prisma.candidateApplication.findUnique({
        where: { id },
        select: { status: true },
      })
      if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
      if (application.status !== 'ASSESSMENT') {
        throw new HttpError(409, 'ASSESSMENT_NOT_AVAILABLE', 'Assessment updates are not available at this stage.')
      }

      await prisma.$transaction(async (transaction) => {
        const stillAssessing = await transaction.candidateApplication.updateMany({
          where: { id, status: 'ASSESSMENT' },
          data: input.status === 'PASSED' ? { status: 'READY_FOR_MATCHING' } : {},
        })
        if (stillAssessing.count !== 1) {
          throw new HttpError(409, 'STATUS_CHANGED', 'The application changed. Refresh and try again.')
        }
        await transaction.assessment.upsert({
          where: { applicationId: id },
          create: {
            applicationId: id,
            status: input.status,
            score: input.score,
            internalNote: input.internalNote,
            completedAt: new Date(),
            updatedById: actorId,
          },
          update: {
            status: input.status,
            score: input.score,
            internalNote: input.internalNote,
            completedAt: new Date(),
            updatedById: actorId,
          },
        })
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'ASSESSMENT_RECORDED',
            entityType: 'CandidateApplication',
            entityId: id,
            details: { status: input.status, ...(input.score === undefined ? {} : { score: input.score }) },
          },
        })
      })
      response.json({
        data: {
          id,
          status: input.status,
          applicationStatus: input.status === 'PASSED' ? 'READY_FOR_MATCHING' : 'ASSESSMENT',
        },
      })
    }),
  )

  router.get(
    '/hiring-requests',
    asyncRoute(async (request, response) => {
      const { status } = hiringRequestListQuerySchema.parse(request.query)
      const requests = await prisma.hiringRequest.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          roleNeeded: true,
          hireCount: true,
          placedCount: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          timeZone: true,
          roleDetails: true,
          status: true,
          createdAt: true,
          _count: { select: { employerMatches: true, placements: true } },
        },
      })
      response.json({ data: requests })
    }),
  )

  router.patch(
    '/hiring-requests/:id/status',
    asyncRoute(async (request, response) => {
      const id = routeId(request.params.id)
      const { status } = hiringRequestStatusSchema.parse(request.body)
      const actorId = request.authUser!.id
      const current = await prisma.hiringRequest.findUnique({
        where: { id },
        select: { status: true, placedCount: true, hireCount: true },
      })
      if (!current) throw new HttpError(404, 'HIRING_REQUEST_NOT_FOUND', 'Hiring request not found.')
      if (
        !canTransitionHiringRequest(
          current.status as HiringRequestStatus,
          status as HiringRequestStatus,
        )
      ) {
        throw new HttpError(409, 'INVALID_STATUS_TRANSITION', 'This hiring request cannot move to that status.')
      }
      if (status === 'FILLED' && current.placedCount < current.hireCount) {
        throw new HttpError(409, 'POSITIONS_REMAIN', 'A request can be marked filled only after all positions are placed.')
      }

      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.hiringRequest.updateMany({
          where: { id, status: current.status },
          data: { status },
        })
        if (updated.count !== 1) {
          throw new HttpError(409, 'STATUS_CHANGED', 'The hiring request changed. Refresh and try again.')
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'HIRING_REQUEST_STATUS_CHANGED',
            entityType: 'HiringRequest',
            entityId: id,
            details: { from: current.status, to: status },
          },
        })
      })
      response.json({ data: { id, status } })
    }),
  )

  router.post(
    '/matches',
    asyncRoute(async (request, response) => {
      const { candidateApplicationId, hiringRequestId } = createMatchSchema.parse(request.body)
      const actorId = request.authUser!.id
      await prisma.$transaction(async (transaction) => {
        const [application, hiringRequest, existing] = await Promise.all([
          transaction.candidateApplication.findUnique({
            where: { id: candidateApplicationId },
            select: {
              status: true,
              roleInterest: true,
              userId: true,
              user: { select: { candidateProfile: { select: { employerVisibilityConsentAt: true } } } },
            },
          }),
          transaction.hiringRequest.findUnique({
            where: { id: hiringRequestId },
            select: { status: true, roleNeeded: true },
          }),
          transaction.candidateEmployerMatch.findUnique({
            where: { candidateApplicationId_hiringRequestId: { candidateApplicationId, hiringRequestId } },
            select: { id: true },
          }),
        ])
        if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
        if (!hiringRequest) throw new HttpError(404, 'HIRING_REQUEST_NOT_FOUND', 'Hiring request not found.')
        if (existing) throw new HttpError(409, 'MATCH_ALREADY_EXISTS', 'This candidate is already matched to that request.')
        if (application.status !== 'READY_FOR_MATCHING') {
          throw new HttpError(409, 'CANDIDATE_NOT_READY', 'The candidate has not completed the required workflow.')
        }
        if (!application.userId || !application.user?.candidateProfile?.employerVisibilityConsentAt) {
          throw new HttpError(403, 'CANDIDATE_CONSENT_REQUIRED', 'The candidate has not consented to profile sharing.')
        }
        if (hiringRequest.status !== 'IN_PROGRESS') {
          throw new HttpError(409, 'HIRING_REQUEST_NOT_ACTIVE', 'The hiring request must be in progress to create a match.')
        }
        if (application.roleInterest !== hiringRequest.roleNeeded) {
          throw new HttpError(409, 'ROLE_MISMATCH', 'The candidate role does not match the hiring request.')
        }

        const match = await transaction.candidateEmployerMatch.create({
          data: { candidateApplicationId, hiringRequestId, createdById: actorId },
          select: { id: true, authorizedAt: true },
        })
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'CANDIDATE_MATCH_AUTHORIZED',
            entityType: 'CandidateEmployerMatch',
            entityId: match.id,
            details: { candidateApplicationId, hiringRequestId },
          },
        })
      })
      response.status(201).json({ data: { candidateApplicationId, hiringRequestId } })
    }),
  )

  router.get(
    '/placements',
    asyncRoute(async (_request, response) => {
      const placements = await prisma.placement.findMany({
        orderBy: { placedAt: 'desc' },
        select: {
          id: true,
          placedAt: true,
          candidateApplication: { select: { id: true, fullName: true, roleInterest: true } },
          hiringRequest: { select: { id: true, companyName: true, roleNeeded: true } },
        },
      })
      response.json({ data: placements })
    }),
  )

  router.post(
    '/placements',
    asyncRoute(async (request, response) => {
      const input = createPlacementSchema.parse(request.body)
      const actorId = request.authUser!.id
      const placement = await prisma.$transaction(async (transaction) => {
        const [application, hiringRequest, match] = await Promise.all([
          transaction.candidateApplication.findUnique({
            where: { id: input.candidateApplicationId },
            select: {
              status: true,
              roleInterest: true,
              user: { select: { candidateProfile: { select: { employerVisibilityConsentAt: true } } } },
            },
          }),
          transaction.hiringRequest.findUnique({
            where: { id: input.hiringRequestId },
            select: { status: true, roleNeeded: true, hireCount: true },
          }),
          transaction.candidateEmployerMatch.findUnique({
            where: {
              candidateApplicationId_hiringRequestId: {
                candidateApplicationId: input.candidateApplicationId,
                hiringRequestId: input.hiringRequestId,
              },
            },
            select: { id: true },
          }),
        ])
        if (!application) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found.')
        if (!hiringRequest) throw new HttpError(404, 'HIRING_REQUEST_NOT_FOUND', 'Hiring request not found.')
        if (application.status !== 'READY_FOR_MATCHING') {
          throw new HttpError(409, 'CANDIDATE_NOT_READY', 'The candidate is not ready to be placed.')
        }
        if (!application.user?.candidateProfile?.employerVisibilityConsentAt || !match) {
          throw new HttpError(403, 'AUTHORIZED_MATCH_REQUIRED', 'An active candidate consent and approved match are required.')
        }
        if (hiringRequest.status !== 'IN_PROGRESS' || application.roleInterest !== hiringRequest.roleNeeded) {
          throw new HttpError(409, 'HIRING_REQUEST_NOT_AVAILABLE', 'The hiring request is not available for this placement.')
        }

        const reserved = await transaction.hiringRequest.updateMany({
          where: {
            id: input.hiringRequestId,
            status: 'IN_PROGRESS',
            placedCount: { lt: hiringRequest.hireCount },
          },
          data: { placedCount: { increment: 1 } },
        })
        if (reserved.count !== 1) {
          throw new HttpError(409, 'POSITIONS_FILLED', 'All positions for this request have been filled.')
        }
        const updated = await transaction.candidateApplication.updateMany({
          where: { id: input.candidateApplicationId, status: 'READY_FOR_MATCHING' },
          data: { status: 'PLACED' },
        })
        if (updated.count !== 1) {
          throw new HttpError(409, 'STATUS_CHANGED', 'The application changed. Refresh and try again.')
        }
        const created = await transaction.placement.create({
          data: {
            candidateApplicationId: input.candidateApplicationId,
            hiringRequestId: input.hiringRequestId,
            placedById: actorId,
            internalNote: input.internalNote,
          },
          select: { id: true, placedAt: true },
        })
        const updatedRequest = await transaction.hiringRequest.findUniqueOrThrow({
          where: { id: input.hiringRequestId },
          select: { placedCount: true, hireCount: true },
        })
        if (updatedRequest.placedCount >= updatedRequest.hireCount) {
          await transaction.hiringRequest.updateMany({
            where: { id: input.hiringRequestId, status: 'IN_PROGRESS' },
            data: { status: 'FILLED' },
          })
        }
        await transaction.auditLog.createMany({
          data: [
            {
              actorId,
              action: 'CANDIDATE_PLACED',
              entityType: 'Placement',
              entityId: created.id,
              details: {
                candidateApplicationId: input.candidateApplicationId,
                hiringRequestId: input.hiringRequestId,
              },
            },
            ...(updatedRequest.placedCount >= updatedRequest.hireCount
              ? [
                  {
                    actorId,
                    action: 'HIRING_REQUEST_FILLED',
                    entityType: 'HiringRequest',
                    entityId: input.hiringRequestId,
                    details: { placedCount: updatedRequest.placedCount },
                  },
                ]
              : []),
          ],
        })
        return created
      })
      response.status(201).json({ data: placement })
    }),
  )

  router.get(
    '/activity',
    asyncRoute(async (_request, response) => {
      const events = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          createdAt: true,
          actor: { select: { id: true, fullName: true } },
        },
      })
      response.json({ data: events })
    }),
  )

  return router
}
