import type { ApplicationStatus, HiringRequestStatus } from '@prisma/client'

const applicationTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['IN_TRAINING'],
  REJECTED: [],
  IN_TRAINING: ['ASSESSMENT'],
  ASSESSMENT: ['READY_FOR_MATCHING'],
  READY_FOR_MATCHING: ['PLACED'],
  PLACED: [],
}

const hiringRequestTransitions: Record<HiringRequestStatus, HiringRequestStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['FILLED', 'CLOSED'],
  FILLED: [],
  CLOSED: [],
}

export function canTransitionApplication(
  current: ApplicationStatus,
  next: ApplicationStatus,
) {
  return applicationTransitions[current].includes(next)
}

export function canTransitionHiringRequest(
  current: HiringRequestStatus,
  next: HiringRequestStatus,
) {
  return hiringRequestTransitions[current].includes(next)
}
