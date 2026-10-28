const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN'
}

interface ApiEnvelope<T> {
  data: T
}

export class ApiRequestError extends Error {
  public readonly status: number
  public readonly code?: string

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function request<T>(
  path: string,
  options: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (response.status === 204) {
    return { data: undefined as T }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiRequestError(
      response.ok
        ? 'The server returned an unreadable response.'
        : 'The request could not be completed. Try again.',
      response.status,
    )
  }

  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined
    throw new ApiRequestError(
      typeof error?.message === 'string'
        ? error.message
        : 'The request could not be completed. Try again.',
      response.status,
      typeof error?.code === 'string' ? error.code : undefined,
    )
  }

  if (
    !isRecord(body) ||
    (!isRecord(body.data) && !Array.isArray(body.data))
  ) {
    throw new ApiRequestError('The server returned an unexpected response.', response.status)
  }
  return { data: body.data as T }
}

async function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
) {
  const response = await request<T>(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return response.data
}

export async function getCandidateDashboard(accessToken: string) {
  return authenticatedRequest<CandidateDashboard>('/candidate/me', accessToken)
}

export async function updateCandidateProfile(
  accessToken: string,
  values: CandidateProfileUpdate,
) {
  return authenticatedRequest('/candidate/me/profile', accessToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export async function updateCandidateVisibility(accessToken: string, consent: boolean) {
  return authenticatedRequest<{ consent: boolean; updatedAt: string | null }>(
    '/candidate/me/visibility',
    accessToken,
    { method: 'PATCH', body: JSON.stringify({ consent }) },
  )
}

export async function getEmployerDashboard(accessToken: string) {
  return authenticatedRequest<EmployerDashboard>('/employer/me', accessToken)
}

export async function updateEmployerProfile(
  accessToken: string,
  values: { fullName?: string; companyName?: string },
) {
  return authenticatedRequest('/employer/me/profile', accessToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export async function getEmployerMatches(accessToken: string) {
  return authenticatedRequest<EmployerMatch[]>('/employer/me/matches', accessToken)
}

export async function getAdminDashboard(accessToken: string) {
  const [applications, hiringRequests, placements, activity] = await Promise.all([
    authenticatedRequest<AdminApplication[]>('/admin/applications', accessToken),
    authenticatedRequest<AdminHiringRequest[]>('/admin/hiring-requests', accessToken),
    authenticatedRequest<AdminPlacement[]>('/admin/placements', accessToken),
    authenticatedRequest<AdminActivity[]>('/admin/activity', accessToken),
  ])
  return { applications, hiringRequests, placements, activity }
}

export async function updateAdminApplicationStatus(
  accessToken: string,
  id: string,
  values: { status: string; internalReviewNote?: string },
) {
  return authenticatedRequest(`/admin/applications/${id}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export async function updateAdminTraining(
  accessToken: string,
  id: string,
  values: { percentage: number; internalNote?: string },
) {
  return authenticatedRequest(`/admin/applications/${id}/training`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export async function updateAdminAssessment(
  accessToken: string,
  id: string,
  values: { status: 'PASSED' | 'FAILED'; score?: number },
) {
  return authenticatedRequest(`/admin/applications/${id}/assessment`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

export async function updateAdminHiringStatus(
  accessToken: string,
  id: string,
  status: string,
) {
  return authenticatedRequest(`/admin/hiring-requests/${id}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function authorizeAdminMatch(
  accessToken: string,
  candidateApplicationId: string,
  hiringRequestId: string,
) {
  return authenticatedRequest('/admin/matches', accessToken, {
    method: 'POST',
    body: JSON.stringify({ candidateApplicationId, hiringRequestId }),
  })
}

export async function createAdminPlacement(
  accessToken: string,
  candidateApplicationId: string,
  hiringRequestId: string,
) {
  return authenticatedRequest('/admin/placements', accessToken, {
    method: 'POST',
    body: JSON.stringify({ candidateApplicationId, hiringRequestId }),
  })
}

export interface CandidateProfileUpdate {
  fullName?: string
  phone?: string | null
  city?: string | null
  educationLevel?: string | null
  currentSkills?: string | null
  roleInterest?: 'CUSTOMER_SUPPORT' | 'VIRTUAL_ASSISTANCE' | 'OPERATIONS_SUPPORT' | null
}

export interface CandidateDashboard {
  id: string
  email: string
  fullName: string
  candidateProfile: {
    phone: string | null
    city: string | null
    educationLevel: string | null
    currentSkills: string | null
    roleInterest: CandidateProfileUpdate['roleInterest'] | null
    employerVisibilityConsentAt: string | null
  } | null
  applications: Array<{
    id: string
    roleInterest: string
    status: string
    createdAt: string
    trainingProgress: { percentage: number; status: string } | null
    assessment: { status: string; score: number | null; completedAt: string | null } | null
    employerMatches: Array<{
      authorizedAt: string
      hiringRequest: { companyName: string; roleNeeded: string; status: string }
    }>
    placement: {
      placedAt: string
      hiringRequest: { companyName: string; roleNeeded: string }
    } | null
  }>
}

export interface EmployerDashboard {
  id: string
  email: string
  fullName: string
  employerProfile: { companyName: string } | null
  hiringRequests: Array<{
    id: string
    companyName: string
    roleNeeded: string
    hireCount: number
    salaryMin: string
    salaryMax: string
    salaryCurrency: string
    salaryPeriod: string
    status: string
    createdAt: string
    _count: { employerMatches: number; placements: number }
  }>
}

export interface EmployerMatch {
  id: string
  authorizedAt: string
  hiringRequest: { id: string; companyName: string; roleNeeded: string }
  candidateApplication: {
    id: string
    fullName: string
    email: string
    phone: string
    city: string
    educationLevel: string
    currentSkills: string
    roleInterest: string
    user: {
      fullName: string
      email: string
      candidateProfile: {
        phone: string | null
        city: string | null
        educationLevel: string | null
        currentSkills: string | null
      } | null
    } | null
  }
}

export interface AdminApplication {
  id: string
  fullName: string
  email: string
  phone: string
  city: string
  educationLevel: string
  currentSkills: string
  remoteWorkReason: string
  roleInterest: string
  status: string
  internalReviewNote: string | null
  createdAt: string
  trainingProgress: { percentage: number; status: string } | null
  assessment: { status: string; score: number | null } | null
  _count: { employerMatches: number }
  employerMatches: Array<{
    id: string
    hiringRequestId: string
    hiringRequest: { companyName: string }
  }>
}

export interface AdminHiringRequest {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  roleNeeded: string
  hireCount: number
  placedCount: number
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  salaryPeriod: string
  timeZone: string
  roleDetails: string | null
  status: string
  createdAt: string
  _count: { employerMatches: number; placements: number }
}

export interface AdminPlacement {
  id: string
  placedAt: string
  candidateApplication: { id: string; fullName: string; roleInterest: string }
  hiringRequest: { id: string; companyName: string; roleNeeded: string }
}

export interface AdminActivity {
  id: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; fullName: string }
}

export async function submitPublicForm(
  path: 'applications' | 'hiring-requests' | 'contact',
  values: Record<string, string | boolean>,
  accessToken: string | null,
) {
  return request<{ id: string; receivedAt: string }>(`/forms/${path}`, {
    method: 'POST',
    body: JSON.stringify(values),
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })
}

export async function registerAccount(
  kind: 'candidate' | 'employer',
  values: Record<string, string | boolean>,
) {
  const response = await request<{
    accessToken: string
    tokenType: 'Bearer'
    expiresIn: number
    user: SessionUser
  }>(`/auth/register/${kind}`, {
    method: 'POST',
    body: JSON.stringify(values),
  })
  return response.data
}

export async function loginAccount(values: { email: string; password: string }) {
  const response = await request<{
    accessToken: string
    tokenType: 'Bearer'
    expiresIn: number
    user: SessionUser
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  })
  return response.data
}

export async function refreshAccount() {
  const response = await request<
    | { authenticated: false }
    | {
        accessToken: string
        tokenType: 'Bearer'
        expiresIn: number
        user: SessionUser
      }
  >('/auth/refresh', { method: 'POST' })
  if (!('accessToken' in response.data)) {
    return null
  }
  return response.data
}

export async function logoutAccount() {
  await request<never>('/auth/logout', { method: 'POST' })
}

export async function getCurrentAccount(accessToken: string) {
  const response = await request<{ user: SessionUser }>('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.data.user
}

export const publicSubmissionsEnabled =
  import.meta.env.VITE_PUBLIC_SUBMISSIONS_ENABLED === 'true'
export const publicRegistrationEnabled =
  import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === 'true'
