import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { CandidateProfileUpdate, EmployerDashboard, EmployerMatch } from '../../lib/api'
import { Panel } from './DashboardShared'
import { dateLabel, displayStatus, roleName } from './dashboardUtils'

type EmployerDashboardViewProps = {
  employer: EmployerDashboard
  matches: EmployerMatch[]
  profile: CandidateProfileUpdate & { companyName?: string }
  setProfile: Dispatch<SetStateAction<CandidateProfileUpdate & { companyName?: string }>>
  busy: boolean
  submitEmployerProfile: (event: FormEvent<HTMLFormElement>) => void
}

export function EmployerDashboardView({ employer, matches, profile, setProfile, busy, submitEmployerProfile }: EmployerDashboardViewProps) {
  return (
<div className="dashboard-grid">
                <Panel title="Company profile">
                  <form className="dashboard-form" onSubmit={submitEmployerProfile}>
                    <label>
                      Contact name
                      <input
                        autoComplete="name"
                        maxLength={120}
                        onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                        required
                        value={profile.fullName ?? ''}
                      />
                    </label>
                    <label>
                      Company name
                      <input
                        maxLength={160}
                        onChange={(event) =>
                          setProfile({ ...profile, companyName: event.target.value })
                        }
                        required
                        value={profile.companyName ?? ''}
                      />
                    </label>
                    <button className="button button--dark" disabled={busy} type="submit">
                      Save company profile
                    </button>
                  </form>
                </Panel>
                <Panel title="Hiring requests">
                  {employer.hiringRequests.length === 0 ? (
                    <p className="dashboard-empty">
                      No hiring requests are linked to this account yet. Request status and
                      placement updates will appear here.
                    </p>
                  ) : (
                    <div className="dashboard-list">
                      {employer.hiringRequests.map((item) => (
                        <article className="dashboard-list-item" key={item.id}>
                          <div className="dashboard-list-item__top">
                            <strong>{roleName(item.roleNeeded)}</strong>
                            <span className="dashboard-status">{displayStatus(item.status)}</span>
                          </div>
                          <p>
                            {item.hireCount} position{item.hireCount === 1 ? '' : 's'} ·{' '}
                            {item.salaryCurrency} {item.salaryMin}–{item.salaryMax} /{' '}
                            {displayStatus(item.salaryPeriod)}
                          </p>
                          <p>Submitted {dateLabel(item.createdAt)}</p>
                          <p>
                            {item._count.employerMatches} authorized match
                            {item._count.employerMatches === 1 ? '' : 'es'} ·{' '}
                            {item._count.placements} placement{item._count.placements === 1 ? '' : 's'}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel title="Administrator-authorized candidates">
                  {matches.length === 0 ? (
                    <p className="dashboard-empty">
                      No candidates have been matched to your requests. Candidate details remain
                      private until the candidate consents and an administrator authorizes a match.
                    </p>
                  ) : (
                    <div className="dashboard-list">
                      {matches.map((match) => (
                        <article className="dashboard-list-item" key={match.id}>
                          <div className="dashboard-list-item__top">
                            <strong>
                              {match.candidateApplication.user?.fullName ??
                                match.candidateApplication.fullName}
                            </strong>
                            <span className="dashboard-status">
                              {roleName(match.candidateApplication.roleInterest)}
                            </span>
                          </div>
                          <p>
                            Matched to {match.hiringRequest.companyName} ·{' '}
                            {dateLabel(match.authorizedAt)}
                          </p>
                          <p>
                            {match.candidateApplication.user?.email ??
                              match.candidateApplication.email}{' '}
                            ·{' '}
                            {match.candidateApplication.user?.candidateProfile?.phone ??
                              match.candidateApplication.phone}
                          </p>
                          <p>
                            {match.candidateApplication.user?.candidateProfile?.city ??
                              match.candidateApplication.city}{' '}
                            ·{' '}
                            {match.candidateApplication.user?.candidateProfile?.educationLevel ??
                              match.candidateApplication.educationLevel}
                          </p>
                          <p>
                            {match.candidateApplication.user?.candidateProfile?.currentSkills ??
                              match.candidateApplication.currentSkills}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
  )
}
