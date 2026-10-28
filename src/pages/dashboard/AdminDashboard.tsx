import type { Dispatch, SetStateAction } from 'react'
import type { AdminActivity, AdminApplication, AdminHiringRequest, AdminPlacement } from '../../lib/api'
import { Panel } from './DashboardShared'
import { dateLabel, displayStatus, roleName } from './dashboardUtils'

type AdminDashboardData = { applications: AdminApplication[]; hiringRequests: AdminHiringRequest[]; placements: AdminPlacement[]; activity: AdminActivity[] }
type AdminDashboardViewProps = {
  admin: AdminDashboardData
  busy: boolean
  selectedRequests: Record<string, string>
  setSelectedRequests: Dispatch<SetStateAction<Record<string, string>>>
  trainingPercentages: Record<string, number>
  setTrainingPercentages: Dispatch<SetStateAction<Record<string, number>>>
  reviewNotes: Record<string, string>
  setReviewNotes: Dispatch<SetStateAction<Record<string, string>>>
  setApplicationStatus: (id: string, status: string) => Promise<void>
  saveTraining: (id: string, current: number) => Promise<void>
  recordAssessment: (id: string, status: 'PASSED' | 'FAILED') => Promise<void>
  authorizeMatch: (applicationId: string) => Promise<void>
  placeCandidate: (applicationId: string, hiringRequestId: string) => Promise<void>
  setHiringStatus: (id: string, status: string) => Promise<void>
}

export function AdminDashboardView({ admin, busy, selectedRequests, setSelectedRequests, trainingPercentages, setTrainingPercentages, reviewNotes, setReviewNotes, setApplicationStatus, saveTraining, recordAssessment, authorizeMatch, placeCandidate, setHiringStatus }: AdminDashboardViewProps) {
  return (
<div className="dashboard-grid dashboard-grid--admin">
                <Panel title={`Applications · ${admin.applications.length}`}>
                  {admin.applications.length === 0 ? (
                    <p className="dashboard-empty">There are no applications to review.</p>
                  ) : (
                    <div className="dashboard-list">
                      {admin.applications.map((application) => (
                        <AdminApplicationCard
                          application={application}
                          busy={busy}
                          hiringRequests={admin.hiringRequests}
                          key={application.id}
                          onAssessment={recordAssessment}
                          onMatch={authorizeMatch}
                          onPlace={placeCandidate}
                          onSelectRequest={(id, value) =>
                            setSelectedRequests({ ...selectedRequests, [id]: value })
                          }
                          onStatus={setApplicationStatus}
                          onTraining={saveTraining}
                          selectedRequest={selectedRequests[application.id] ?? ''}
                          trainingPercentage={
                            trainingPercentages[application.id] ??
                            application.trainingProgress?.percentage ??
                            0
                          }
                          onTrainingPercentage={(id, value) =>
                            setTrainingPercentages({ ...trainingPercentages, [id]: value })
                          }
                          reviewNote={reviewNotes[application.id] ?? application.internalReviewNote ?? ''}
                          onReviewNote={(id, value) =>
                            setReviewNotes({ ...reviewNotes, [id]: value })
                          }
                        />
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel title={`Hiring requests · ${admin.hiringRequests.length}`}>
                  {admin.hiringRequests.length === 0 ? (
                    <p className="dashboard-empty">There are no hiring requests to review.</p>
                  ) : (
                    <div className="dashboard-list">
                      {admin.hiringRequests.map((item) => (
                        <article className="dashboard-list-item" key={item.id}>
                          <div className="dashboard-list-item__top">
                            <strong>{item.companyName} · {roleName(item.roleNeeded)}</strong>
                            <span className="dashboard-status">{displayStatus(item.status)}</span>
                          </div>
                          <p>{item.contactName} · {item.contactEmail}</p>
                          <p>
                            {item.salaryCurrency} {item.salaryMin}–{item.salaryMax} /{' '}
                            {displayStatus(item.salaryPeriod)} · {item.timeZone}
                          </p>
                          {item.roleDetails && <p>{item.roleDetails}</p>}
                          <p>
                            {item.placedCount}/{item.hireCount} placements ·{' '}
                            {item._count.employerMatches} authorized matches
                          </p>
                          <div className="dashboard-actions">
                            {item.status === 'SUBMITTED' && (
                              <button
                                className="button button--small button--outline"
                                disabled={busy}
                                onClick={() => void setHiringStatus(item.id, 'UNDER_REVIEW')}
                                type="button"
                              >
                                Start review
                              </button>
                            )}
                            {item.status === 'UNDER_REVIEW' && (
                              <>
                                <button
                                  className="button button--small button--outline"
                                  disabled={busy}
                                  onClick={() => void setHiringStatus(item.id, 'IN_PROGRESS')}
                                  type="button"
                                >
                                  Open hiring
                                </button>
                                <button
                                  className="button button--small button--outline"
                                  disabled={busy}
                                  onClick={() => void setHiringStatus(item.id, 'CLOSED')}
                                  type="button"
                                >
                                  Close
                                </button>
                              </>
                            )}
                            {item.status === 'IN_PROGRESS' && item.placedCount < item.hireCount && (
                              <button
                                className="button button--small button--outline"
                                disabled={busy}
                                onClick={() => void setHiringStatus(item.id, 'CLOSED')}
                                type="button"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel title={`Placements · ${admin.placements.length}`}>
                  {admin.placements.length === 0 ? (
                    <p className="dashboard-empty">No placements have been recorded.</p>
                  ) : (
                    <div className="dashboard-list">
                      {admin.placements.map((placement) => (
                        <article className="dashboard-list-item" key={placement.id}>
                          <strong>{placement.candidateApplication.fullName}</strong>
                          <p>
                            {roleName(placement.candidateApplication.roleInterest)} at{' '}
                            {placement.hiringRequest.companyName}
                          </p>
                          <p>{dateLabel(placement.placedAt)}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel title="Recent administrative activity">
                  {admin.activity.length === 0 ? (
                    <p className="dashboard-empty">Administrative actions will be recorded here.</p>
                  ) : (
                    <div className="dashboard-list">
                      {admin.activity.slice(0, 12).map((event) => (
                        <article className="dashboard-list-item" key={event.id}>
                          <strong>{displayStatus(event.action)}</strong>
                          <p>
                            {event.actor.fullName} · {displayStatus(event.entityType)} ·{' '}
                            {dateLabel(event.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
  )
}

function AdminApplicationCard({
  application,
  hiringRequests,
  selectedRequest,
  trainingPercentage,
  reviewNote,
  busy,
  onSelectRequest,
  onTrainingPercentage,
  onReviewNote,
  onStatus,
  onTraining,
  onAssessment,
  onMatch,
  onPlace,
}: {
  application: AdminApplication
  hiringRequests: AdminHiringRequest[]
  selectedRequest: string
  trainingPercentage: number
  reviewNote: string
  busy: boolean
  onSelectRequest: (id: string, requestId: string) => void
  onTrainingPercentage: (id: string, percentage: number) => void
  onReviewNote: (id: string, note: string) => void
  onStatus: (id: string, status: string) => void
  onTraining: (id: string, current: number) => void
  onAssessment: (id: string, status: 'PASSED' | 'FAILED') => void
  onMatch: (id: string) => void
  onPlace: (applicationId: string, requestId: string) => void
}) {
  const activeMatches = application.employerMatches ?? []
  const availableRequests = hiringRequests.filter(
    (request) =>
      request.status === 'IN_PROGRESS' &&
      request.roleNeeded === application.roleInterest &&
      !activeMatches.some((match) => match.hiringRequestId === request.id),
  )

  return (
    <article className="dashboard-list-item">
      <div className="dashboard-list-item__top">
        <strong>{application.fullName} · {roleName(application.roleInterest)}</strong>
        <span className="dashboard-status">{displayStatus(application.status)}</span>
      </div>
      <p>
        {application.email} · {application.phone} · {application.city} ·{' '}
        {application.educationLevel} · Received {dateLabel(application.createdAt)}
      </p>
      <p>Skills and experience: {application.currentSkills}</p>
      <p>Motivation: {application.remoteWorkReason}</p>
      {(application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW') && (
        <label className="dashboard-review-note">
          Internal review note
          <textarea
            maxLength={2000}
            onChange={(event) => onReviewNote(application.id, event.target.value)}
            rows={2}
            value={reviewNote}
          />
        </label>
      )}
      {application.trainingProgress && (
        <p>Training: {application.trainingProgress.percentage}%</p>
      )}
      {application.assessment && (
        <p>Assessment: {displayStatus(application.assessment.status)}</p>
      )}
      <div className="dashboard-actions">
        {application.status === 'SUBMITTED' && (
          <button
            className="button button--small button--outline"
            disabled={busy}
            onClick={() => void onStatus(application.id, 'UNDER_REVIEW')}
            type="button"
          >
            Start review
          </button>
        )}
        {application.status === 'UNDER_REVIEW' && (
          <>
            <button
              className="button button--small button--outline"
              disabled={busy}
              onClick={() => void onStatus(application.id, 'APPROVED')}
              type="button"
            >
              Approve
            </button>
            <button
              className="button button--small button--outline"
              disabled={busy}
              onClick={() => void onStatus(application.id, 'REJECTED')}
              type="button"
            >
              Reject
            </button>
          </>
        )}
        {application.status === 'APPROVED' && (
          <button
            className="button button--small button--outline"
            disabled={busy}
            onClick={() => void onStatus(application.id, 'IN_TRAINING')}
            type="button"
          >
            Start training
          </button>
        )}
        {application.status === 'IN_TRAINING' && (
          <form
            className="dashboard-inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onTraining(application.id, trainingPercentage)
            }}
          >
            <label>
              Training completion %
              <input
                max={100}
                min={0}
                onChange={(event) =>
                  onTrainingPercentage(application.id, Number(event.target.value))
                }
                type="number"
                value={trainingPercentage}
              />
            </label>
            <button className="button button--small button--outline" disabled={busy} type="submit">
              Save progress
            </button>
          </form>
        )}
        {application.status === 'ASSESSMENT' && (
          <>
            <button
              className="button button--small button--outline"
              disabled={busy}
              onClick={() => void onAssessment(application.id, 'PASSED')}
              type="button"
            >
              Record pass
            </button>
            <button
              className="button button--small button--outline"
              disabled={busy}
              onClick={() => void onAssessment(application.id, 'FAILED')}
              type="button"
            >
              Record fail
            </button>
          </>
        )}
        {application.status === 'READY_FOR_MATCHING' && availableRequests.length > 0 && (
          <div className="dashboard-inline-form">
            <label>
              Active matching request
              <select
                onChange={(event) => onSelectRequest(application.id, event.target.value)}
                value={selectedRequest}
              >
                <option value="">Choose a request</option>
                {availableRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.companyName} · {roleName(request.roleNeeded)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button--small button--outline"
              disabled={busy || !selectedRequest}
              onClick={() => void onMatch(application.id)}
              type="button"
            >
              Authorize match
            </button>
          </div>
        )}
        {activeMatches.map((match) => (
          <button
            className="button button--small button--outline"
            disabled={busy}
            key={match.id}
            onClick={() => void onPlace(application.id, match.hiringRequestId)}
            type="button"
          >
            Confirm placement · {match.hiringRequest.companyName}
          </button>
        ))}
      </div>
    </article>
  )
}
