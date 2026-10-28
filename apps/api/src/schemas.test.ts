import { describe, expect, it } from 'vitest'
import {
  candidateApplicationSchema,
  candidateRegistrationSchema,
  contactMessageSchema,
  employerRegistrationSchema,
  hiringRequestSchema,
  loginSchema,
} from './schemas.js'

const application = {
  fullName: 'Ada Okafor',
  email: 'Ada@Example.com',
  phone: '+234 801 234 5678',
  city: 'Lagos',
  educationLevel: 'bachelors',
  currentSkills: 'Customer communication, documentation, and scheduling',
  roleInterest: 'customer-support',
  remoteWorkReason:
    'I want to build a career where I can support customers and keep learning.',
  privacyConsent: true,
}

describe('server-side public form schemas', () => {
  it('normalizes and validates a candidate application before database access', () => {
    const parsed = candidateApplicationSchema.parse(application)
    expect(parsed.email).toBe('ada@example.com')
    expect(parsed.roleInterest).toBe('CUSTOMER_SUPPORT')
  })

  it('requires explicit privacy acknowledgment and rejects unknown fields', () => {
    expect(
      candidateApplicationSchema.safeParse({ ...application, privacyConsent: false }).success,
    ).toBe(false)
    expect(candidateApplicationSchema.safeParse({ ...application, isAdmin: true }).success).toBe(
      false,
    )
  })

  it('rejects reversed salary ranges and converts role, currency, and pay period', () => {
    const request = hiringRequestSchema.safeParse({
      companyName: 'Example Company',
      contactName: 'Sam Example',
      contactEmail: 'sam@example.com',
      roleNeeded: 'operations-support',
      hireCount: '2',
      salaryMin: '3000',
      salaryMax: '2000',
      salaryCurrency: 'usd',
      salaryPeriod: 'monthly',
      timeZone: 'UTC-5',
      roleDetails: '',
      privacyConsent: true,
    })
    expect(request.success).toBe(false)

    const valid = hiringRequestSchema.parse({
      companyName: 'Example Company',
      contactName: 'Sam Example',
      contactEmail: 'sam@example.com',
      roleNeeded: 'operations-support',
      hireCount: '2',
      salaryMin: '1500',
      salaryMax: '2200',
      salaryCurrency: 'usd',
      salaryPeriod: 'monthly',
      timeZone: 'UTC-5',
      roleDetails: '',
      privacyConsent: true,
    })
    expect(valid.salaryCurrency).toBe('USD')
    expect(valid.salaryPeriod).toBe('MONTHLY')
    expect(valid.roleNeeded).toBe('OPERATIONS_SUPPORT')

    expect(
      hiringRequestSchema.parse({
        companyName: 'Example Company',
        contactName: 'Sam Example',
        contactEmail: 'sam@example.com',
        roleNeeded: 'operations-support',
        hireCount: '2',
        salaryMin: '1500',
        salaryMax: '2200',
        salaryCurrency: 'usd',
        timeZone: 'UTC-5',
        roleDetails: '',
        privacyConsent: true,
        salaryPeriod: 'weekly',
      }).salaryPeriod,
    ).toBe('WEEKLY')
    expect(
      hiringRequestSchema.parse({
        companyName: 'Example Company',
        contactName: 'Sam Example',
        contactEmail: 'sam@example.com',
        roleNeeded: 'operations-support',
        hireCount: '2',
        salaryMin: '1500',
        salaryMax: '2200',
        salaryCurrency: 'usd',
        salaryPeriod: 'bi-weekly',
        timeZone: 'UTC-5',
        roleDetails: '',
        privacyConsent: true,
      }).salaryPeriod,
    ).toBe('BIWEEKLY')
    expect(
      hiringRequestSchema.safeParse({
        companyName: 'Example Company',
        contactName: 'Sam Example',
        contactEmail: 'sam@example.com',
        roleNeeded: 'operations-support',
        hireCount: '2',
        salaryMin: '1500',
        salaryMax: '2200',
        salaryCurrency: 'usd',
        salaryPeriod: 'annual',
        timeZone: 'UTC-5',
        roleDetails: '',
        privacyConsent: true,
      }).success,
    ).toBe(false)
  })

  it('validates contact messages and bounded fields', () => {
    const valid = {
      name: 'Sam Example',
      email: 'sam@example.com',
      subject: 'Program question',
      message: 'I would like to know when applications are expected to open.',
      privacyConsent: true,
    }
    expect(contactMessageSchema.safeParse(valid).success).toBe(true)
    expect(contactMessageSchema.safeParse({ ...valid, message: 'Hi' }).success).toBe(false)
  })
})

describe('public authentication schemas', () => {
  it('rejects administrator role assignment during public registration', () => {
    const candidate = candidateRegistrationSchema.safeParse({
      fullName: 'Ada Okafor',
      email: 'ada@example.com',
      password: 'a-long-test-password',
      privacyConsent: true,
      role: 'ADMIN',
    })
    const employer = employerRegistrationSchema.safeParse({
      fullName: 'Sam Example',
      email: 'sam@example.com',
      password: 'a-long-test-password',
      companyName: 'Example Company',
      privacyConsent: true,
      role: 'ADMIN',
    })

    expect(candidate.success).toBe(false)
    expect(employer.success).toBe(false)
  })

  it('requires long registration passwords and accepts a valid login shape', () => {
    expect(
      candidateRegistrationSchema.safeParse({
        fullName: 'Ada Okafor',
        email: 'ada@example.com',
        password: 'short',
        privacyConsent: true,
      }).success,
    ).toBe(false)
    expect(
      loginSchema.safeParse({
        email: 'ada@example.com',
        password: 'a-valid-test-password',
      }).success,
    ).toBe(true)
    expect(
      candidateRegistrationSchema.safeParse({
        fullName: 'Ada Okafor',
        email: 'ada@example.com',
        password: 'é'.repeat(37),
        privacyConsent: true,
      }).success,
    ).toBe(false)
    expect(
      loginSchema.safeParse({
        email: 'ada@example.com',
        password: 'a'.repeat(72),
      }).success,
    ).toBe(true)
    expect(
      loginSchema.safeParse({
        email: 'ada@example.com',
        password: 'a'.repeat(73),
      }).success,
    ).toBe(false)
  })
})
