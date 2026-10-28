import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { CandidateDashboard, CandidateProfileUpdate } from '../../lib/api'
import { Panel } from './DashboardShared'
import { dateLabel, displayStatus, roleName } from './dashboardUtils'

type CandidateDashboardViewProps = {
  candidate: CandidateDashboard
  profile: CandidateProfileUpdate & { companyName?: string }
  setProfile: Dispatch<SetStateAction<CandidateProfileUpdate & { companyName?: string }>>
  busy: boolean
  submitProfile: (event: FormEvent<HTMLFormElement>) => void
  updateVisibility: (consent: boolean) => Promise<void>
}

function candidateRole(value: string): NonNullable<CandidateProfileUpdate['roleInterest']> | undefined {
  switch (value) {
    case 'CUSTOMER_SUPPORT':
    case 'VIRTUAL_ASSISTANCE':
    case 'OPERATIONS_SUPPORT':
      return value
    default:
      return undefined
  }
}

export function CandidateDashboardView({ candidate, profile, setProfile, busy, submitProfile, updateVisibility }: CandidateDashboardViewProps) {
  return (
<div className="dashboard-grid">
                <Panel title="Your profile">
                  <form className="dashboard-form" onSubmit={submitProfile}>
                    <label>
                      Full name
                      <input
                        autoComplete="name"
                        maxLength={120}
                        onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                        required
                        value={profile.fullName ?? ''}
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        autoComplete="tel"
                        maxLength={30}
                        onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                        value={profile.phone ?? ''}
                      />
                    </label>
                    <label>
                      City
                      <input
                        maxLength={100}
                        onChange={(event) => setProfile({ ...profile, city: event.target.value })}
                        value={profile.city ?? ''}
                      />
                    </label>
                    <label>
                      Education
                      <input
                        maxLength={80}
                        onChange={(event) =>
                          setProfile({ ...profile, educationLevel: event.target.value })
                        }
                        value={profile.educationLevel ?? ''}
                      />
                    </label>
                    <label>
                      Skills and experience
                      <textarea
                        maxLength={1200}
                        onChange={(event) =>
                          setProfile({ ...profile, currentSkills: event.target.value })
                        }
                        rows={4}
                        value={profile.currentSkills ?? ''}
                      />
                    </label>
                    <label>
                      Role interest
                      <select
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            roleInterest: candidateRole(event.target.value),
                          })
                        }
                        value={profile.roleInterest ?? ''}
                      >
                        <option value="">Select a role</option>
                        <option value="CUSTOMER_SUPPORT">Customer support</option>
                        <option value="VIRTUAL_ASSISTANCE">Virtual assistance</option>
                        <option value="OPERATIONS_SUPPORT">Operations support</option>
                      </select>
                    </label>
                    <button className="button button--dark" disabled={busy} type="submit">
                      Save profile
                    </button>
                  </form>
                  <div className="dashboard-consent">
                    <div>
                      <strong>Employer profile visibility</strong>
                      <p>
                        Employers only see your profile when you consent and an administrator
                        authorizes a match. You can revoke consent at any time.
                      </p>
                      <span className="dashboard-status">
                        {candidate.candidateProfile?.employerVisibilityConsentAt
                          ? 'Consent active'
                          : 'Not shared'}
                      </span>
                    </div>
                    <button
                      className="button button--small button--outline"
                      disabled={busy}
                      onClick={() =>
                        void updateVisibility(!candidate.candidateProfile?.employerVisibilityConsentAt)
                      }
                      type="button"
                    >
                      {candidate.candidateProfile?.employerVisibilityConsentAt
                        ? 'Revoke consent'
                        : 'Give consent'}
                    </button>
                  </div>
                </Panel>
                <Panel title="Application progress">
                  {candidate.applications.length === 0 ? (
                    <p className="dashboard-empty">
                      No applications are linked to this account yet. Your application progress
                      will appear here when an application is received.
                    </p>
                  ) : (
                    <div className="dashboard-list">
                      {candidate.applications.map((application) => (
                        <article className="dashboard-list-item" key={application.id}>
                          <div className="dashboard-list-item__top">
                            <strong>{roleName(application.roleInterest)}</strong>
                            <span className="dashboard-status">{displayStatus(application.status)}</span>
                          </div>
                          <p>Received {dateLabel(application.createdAt)}</p>
                          {application.trainingProgress && (
                            <div className="dashboard-progress">
                              <div>
                                <span>Training</span>
                                <strong>{application.trainingProgress.percentage}%</strong>
                              </div>
                              <progress
                                aria-label={`Training progress: ${application.trainingProgress.percentage}%`}
                                max={100}
                                value={application.trainingProgress.percentage}
                              />
                            </div>
                          )}
                          {application.assessment && (
                            <p>Assessment: {displayStatus(application.assessment.status)}</p>
                          )}
                          {application.employerMatches.map((match) => (
                            <p className="dashboard-update" key={match.authorizedAt}>
                              An administrator authorized a match with {match.hiringRequest.companyName}.
                            </p>
                          ))}
                          {application.placement && (
                            <p className="dashboard-update">
                              Placed with {application.placement.hiringRequest.companyName} on{' '}
                              {dateLabel(application.placement.placedAt)}.
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
  )
}
