import { describe, expect, it } from 'vitest'
import {
  validateCandidateApplication,
  validateContactMessage,
  validateHiringRequest,
  type CandidateApplicationValues,
  type ContactMessageValues,
  type HiringRequestValues,
} from './formValidation'

const validCandidate: CandidateApplicationValues = {
  fullName: 'Ada Okafor',
  email: 'ada@example.com',
  phone: '+234 801 234 5678',
  city: 'Lagos',
  educationLevel: 'bachelors',
  currentSkills: 'Customer communication, documentation, and scheduling',
  roleInterest: 'customer-support',
  remoteWorkReason:
    'I want to build a career where I can support customers and keep learning.',
  privacyConsent: true,
}

const validHiringRequest: HiringRequestValues = {
  companyName: 'Example Company',
  contactName: 'Sam Example',
  contactEmail: 'sam@example.com',
  roleNeeded: 'operations-support',
  hireCount: '2',
  salaryMin: '1500',
  salaryMax: '2200',
  salaryCurrency: 'USD',
  salaryPeriod: 'monthly',
  timeZone: 'UTC-5',
  roleDetails: '',
  privacyConsent: true,
}

const validContactMessage: ContactMessageValues = {
  name: 'Sam Example',
  email: 'sam@example.com',
  subject: 'Program question',
  message: 'I would like to know when applications are expected to open.',
  privacyConsent: true,
}

describe('validateCandidateApplication', () => {
  it('accepts a complete application with valid contact details', () => {
    expect(validateCandidateApplication(validCandidate)).toEqual({})
  })

  it('reports invalid email, phone, and short written response', () => {
    const errors = validateCandidateApplication({
      ...validCandidate,
      email: 'not-an-email',
      phone: '123',
      remoteWorkReason: 'I want a remote job.',
    })

    expect(errors.email).toBeTruthy()
    expect(errors.phone).toBeTruthy()
    expect(errors.remoteWorkReason).toBeTruthy()
  })

  it('requires a supported role and bounded text fields', () => {
    const errors = validateCandidateApplication({
      ...validCandidate,
      roleInterest: 'something-else',
      currentSkills: 'x'.repeat(1201),
    })

    expect(errors.roleInterest).toBeTruthy()
    expect(errors.currentSkills).toBeTruthy()
  })
})

describe('validateHiringRequest', () => {
  it('accepts a complete request with an explicit pay period', () => {
    expect(validateHiringRequest(validHiringRequest)).toEqual({})
  })

  it.each(['weekly', 'bi-weekly'])('accepts %s compensation', (salaryPeriod) => {
    expect(validateHiringRequest({ ...validHiringRequest, salaryPeriod })).toEqual({})
  })

  it('rejects annual compensation', () => {
    expect(
      validateHiringRequest({ ...validHiringRequest, salaryPeriod: 'annual' }).salaryPeriod,
    ).toBeTruthy()
  })

  it('rejects nonpositive or fractional hire counts', () => {
    const errors = validateHiringRequest({ ...validHiringRequest, hireCount: '1.5' })
    expect(errors.hireCount).toBeTruthy()
  })

  it('requires a valid currency, pay period, and ordered salary range', () => {
    const errors = validateHiringRequest({
      ...validHiringRequest,
      salaryMin: '3000',
      salaryMax: '2000',
      salaryCurrency: 'US',
      salaryPeriod: '',
    })

    expect(errors.salaryMax).toBeTruthy()
    expect(errors.salaryCurrency).toBeTruthy()
    expect(errors.salaryPeriod).toBeTruthy()
  })
})

describe('validateContactMessage', () => {
  it('accepts a valid message', () => {
    expect(validateContactMessage(validContactMessage)).toEqual({})
  })

  it('rejects missing subjects and short messages', () => {
    const errors = validateContactMessage({
      ...validContactMessage,
      subject: '',
      message: 'Hi',
    })

    expect(errors.subject).toBeTruthy()
    expect(errors.message).toBeTruthy()
  })
})
