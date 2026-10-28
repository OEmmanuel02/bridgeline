import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ApiRequestError,
  authorizeAdminMatch,
  createAdminPlacement,
  getAdminDashboard,
  getCandidateDashboard,
  getEmployerDashboard,
  getEmployerMatches,
  updateAdminApplicationStatus,
  updateAdminAssessment,
  updateAdminHiringStatus,
  updateAdminTraining,
  updateCandidateProfile,
  updateCandidateVisibility,
  updateEmployerProfile,
  type AdminActivity,
  type AdminApplication,
  type AdminHiringRequest,
  type AdminPlacement,
  type CandidateDashboard,
  type CandidateProfileUpdate,
  type EmployerDashboard,
  type EmployerMatch,
} from '../lib/api'
import { useSession } from '../lib/useSession'
import { CandidateDashboardView } from './dashboard/CandidateDashboard'
import { EmployerDashboardView } from './dashboard/EmployerDashboard'
import { AdminDashboardView } from './dashboard/AdminDashboard'
import { displayStatus } from './dashboard/dashboardUtils'

export function DashboardPage({ onSignOut }: { onSignOut: () => void }) {
  const { accessToken, user, sessionError } = useSession()
  const [candidate, setCandidate] = useState<CandidateDashboard | null>(null)
  const [employer, setEmployer] = useState<EmployerDashboard | null>(null)
  const [matches, setMatches] = useState<EmployerMatch[]>([])
  const [admin, setAdmin] = useState<{
    applications: AdminApplication[]
    hiringRequests: AdminHiringRequest[]
    placements: AdminPlacement[]
    activity: AdminActivity[]
  } | null>(null)
  const [profile, setProfile] = useState<CandidateProfileUpdate & { companyName?: string }>({})
  const [selectedRequests, setSelectedRequests] = useState<Record<string, string>>({})
  const [trainingPercentages, setTrainingPercentages] = useState<Record<string, number>>({})
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(sessionError)
  const [notice, setNotice] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!accessToken || !user) return
    if (user.role === 'CANDIDATE') {
      const data = await getCandidateDashboard(accessToken)
      setError(null)
      setCandidate(data)
      setProfile({
        fullName: data.fullName,
        phone: data.candidateProfile?.phone ?? '',
        city: data.candidateProfile?.city ?? '',
        educationLevel: data.candidateProfile?.educationLevel ?? '',
        currentSkills: data.candidateProfile?.currentSkills ?? '',
        roleInterest: data.candidateProfile?.roleInterest ?? undefined,
      })
    } else if (user.role === 'EMPLOYER') {
      const [data, authorizedMatches] = await Promise.all([
        getEmployerDashboard(accessToken),
        getEmployerMatches(accessToken),
      ])
      setError(null)
      setEmployer(data)
      setMatches(authorizedMatches)
      setProfile({ fullName: data.fullName, companyName: data.employerProfile?.companyName ?? '' })
    } else {
      const data = await getAdminDashboard(accessToken)
      setError(null)
      setAdmin(data)
    }
  }, [accessToken, user])

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(loadDashboard)
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'The dashboard could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadDashboard])

  async function perform(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      await loadDashboard()
      setNotice(message)
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError || cause instanceof Error
          ? cause.message
          : 'The action could not be completed.',
      )
    } finally {
      setBusy(false)
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || user?.role !== 'CANDIDATE') return
    const values: CandidateProfileUpdate = {
      fullName: profile.fullName?.trim(),
      phone: profile.phone?.trim() || null,
      city: profile.city?.trim() || null,
      educationLevel: profile.educationLevel?.trim() || null,
      currentSkills: profile.currentSkills?.trim() || null,
      roleInterest: profile.roleInterest ?? null,
    }
    void perform(
      () => updateCandidateProfile(accessToken, values),
      'Your profile has been updated.',
    )
  }

  function submitEmployerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || user?.role !== 'EMPLOYER') return
    void perform(
      () =>
        updateEmployerProfile(accessToken, {
          fullName: profile.fullName?.trim(),
          companyName: profile.companyName?.trim(),
        }),
      'Your company profile has been updated.',
    )
  }

  async function updateVisibility(consent: boolean) {
    if (!accessToken) return
    const confirmText = consent
      ? 'Allow employers to view your candidate profile after an administrator approves a match?'
      : 'Revoke consent for employers to view your profile? Existing authorized matches will no longer display it.'
    if (!window.confirm(confirmText)) return
    await perform(
      () => updateCandidateVisibility(accessToken, consent),
      consent ? 'Profile-sharing consent has been recorded.' : 'Profile-sharing consent has been revoked.',
    )
  }

  async function setApplicationStatus(id: string, status: string) {
    if (!accessToken) return
    await perform(
      () =>
        updateAdminApplicationStatus(accessToken, id, {
          status,
          ...(reviewNotes[id] === undefined ? {} : { internalReviewNote: reviewNotes[id] }),
        }),
      `Application moved to ${displayStatus(status)}.`,
    )
  }

  async function setHiringStatus(id: string, status: string) {
    if (!accessToken) return
    await perform(
      () => updateAdminHiringStatus(accessToken, id, status),
      `Hiring request moved to ${displayStatus(status)}.`,
    )
  }

  async function saveTraining(id: string, current: number) {
    if (!accessToken) return
    await perform(
      () =>
        updateAdminTraining(accessToken, id, {
          percentage: trainingPercentages[id] ?? current,
        }),
      'Training progress has been saved.',
    )
  }

  async function recordAssessment(id: string, status: 'PASSED' | 'FAILED') {
    if (!accessToken) return
    await perform(
      () => updateAdminAssessment(accessToken, id, { status }),
      `Assessment recorded as ${status.toLowerCase()}.`,
    )
  }

  async function authorizeMatch(applicationId: string) {
    if (!accessToken) return
    const requestId = selectedRequests[applicationId]
    if (!requestId) {
      setError('Choose an active hiring request before authorizing a match.')
      return
    }
    await perform(
      () => authorizeAdminMatch(accessToken, applicationId, requestId),
      'The match has been authorized.',
    )
  }

  async function placeCandidate(applicationId: string, hiringRequestId: string) {
    if (!accessToken) return
    if (!window.confirm('Confirm this candidate placement? This will update the application and hiring request.')) {
      return
    }
    await perform(
      () => createAdminPlacement(accessToken, applicationId, hiringRequestId),
      'The placement has been recorded.',
    )
  }

  if (!user) return null
  const roleLabel = { CANDIDATE: 'Candidate', EMPLOYER: 'Employer', ADMIN: 'Administrator' }[
    user.role
  ]

  return (
    <section className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">{roleLabel} workspace</p>
            <h1>Welcome, {user.fullName}.</h1>
            <p>{user.email}</p>
          </div>
          <button className="button button--dark button--small" onClick={onSignOut} type="button">
            Sign out
          </button>
        </header>

        {error && <p className="dashboard-alert dashboard-alert--error" role="alert">{error}</p>}
        {notice && <p className="dashboard-alert dashboard-alert--success" role="status">{notice}</p>}
        {loading ? (
          <p className="dashboard-loading" aria-live="polite">Loading your workspace…</p>
        ) : (
          <>
            {user.role === 'CANDIDATE' && candidate && (
              <CandidateDashboardView candidate={candidate} profile={profile} setProfile={setProfile} busy={busy} submitProfile={submitProfile} updateVisibility={updateVisibility} />
            )}
            {user.role === 'EMPLOYER' && employer && (
              <EmployerDashboardView employer={employer} matches={matches} profile={profile} setProfile={setProfile} busy={busy} submitEmployerProfile={submitEmployerProfile} />
            )}
            {user.role === 'ADMIN' && admin && (
              <AdminDashboardView
                admin={admin} busy={busy} selectedRequests={selectedRequests} setSelectedRequests={setSelectedRequests}
                trainingPercentages={trainingPercentages} setTrainingPercentages={setTrainingPercentages}
                reviewNotes={reviewNotes} setReviewNotes={setReviewNotes}
                setApplicationStatus={setApplicationStatus} saveTraining={saveTraining}
                recordAssessment={recordAssessment} authorizeMatch={authorizeMatch}
                placeCandidate={placeCandidate} setHiringStatus={setHiringStatus}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}
