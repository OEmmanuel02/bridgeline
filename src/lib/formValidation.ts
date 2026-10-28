export interface CandidateApplicationValues {
  fullName: string
  email: string
  phone: string
  city: string
  educationLevel: string
  currentSkills: string
  roleInterest: string
  remoteWorkReason: string
  privacyConsent: boolean
}

export interface HiringRequestValues {
  companyName: string
  contactName: string
  contactEmail: string
  roleNeeded: string
  hireCount: string
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  salaryPeriod: string
  timeZone: string
  roleDetails: string
  privacyConsent: boolean
}

export interface ContactMessageValues {
  name: string
  email: string
  subject: string
  message: string
  privacyConsent: boolean
}

export type FormErrors = Record<string, string>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[\d\s().-]+$/
const candidateRoles = new Set([
  'customer-support',
  'virtual-assistance',
  'operations-support',
])
const salaryPeriods = new Set(['hourly', 'weekly', 'bi-weekly', 'monthly'])

function isBlank(value: string) {
  return value.trim().length === 0
}

function checkText(
  errors: FormErrors,
  field: string,
  value: string,
  label: string,
  maxLength: number,
) {
  if (isBlank(value)) {
    errors[field] = `${label} is required.`
  } else if (value.trim().length > maxLength) {
    errors[field] = `${label} must be ${maxLength} characters or fewer.`
  }
}

function checkEmail(errors: FormErrors, field: string, value: string, label: string) {
  if (!emailPattern.test(value.trim()) || value.length > 254) {
    errors[field] = `Enter a valid ${label.toLowerCase()}.`
  }
}

function checkPhone(errors: FormErrors, value: string) {
  const digits = value.replace(/\D/g, '')
  if (!phonePattern.test(value.trim()) || digits.length < 7 || digits.length > 15) {
    errors.phone = 'Enter a valid phone number, including country code if available.'
  }
}

export function validateCandidateApplication(values: CandidateApplicationValues): FormErrors {
  const errors: FormErrors = {}
  checkText(errors, 'fullName', values.fullName, 'Full name', 120)
  checkEmail(errors, 'email', values.email, 'email address')
  checkPhone(errors, values.phone)
  checkText(errors, 'city', values.city, 'City', 100)

  if (isBlank(values.educationLevel)) {
    errors.educationLevel = 'Select your education level.'
  }
  checkText(errors, 'currentSkills', values.currentSkills, 'Current skills', 1200)

  if (!candidateRoles.has(values.roleInterest)) {
    errors.roleInterest = 'Select a role of interest.'
  }
  if (values.remoteWorkReason.trim().length < 30) {
    errors.remoteWorkReason = 'Please write at least 30 characters.'
  } else if (values.remoteWorkReason.trim().length > 1200) {
    errors.remoteWorkReason = 'Your answer must be 1200 characters or fewer.'
  }
  if (!values.privacyConsent) {
    errors.privacyConsent = 'Acknowledge the privacy notice to continue.'
  }

  return errors
}

export function validateHiringRequest(values: HiringRequestValues): FormErrors {
  const errors: FormErrors = {}
  checkText(errors, 'companyName', values.companyName, 'Company name', 160)
  checkText(errors, 'contactName', values.contactName, 'Contact name', 120)
  checkEmail(errors, 'contactEmail', values.contactEmail, 'contact email')

  if (isBlank(values.roleNeeded)) {
    errors.roleNeeded = 'Select the role you need.'
  }

  const hireCount = Number(values.hireCount)
  if (!Number.isInteger(hireCount) || hireCount < 1) {
    errors.hireCount = 'Enter a whole number of hires greater than zero.'
  }

  const salaryMin = Number(values.salaryMin)
  const salaryMax = Number(values.salaryMax)
  if (!Number.isFinite(salaryMin) || salaryMin <= 0) {
    errors.salaryMin = 'Enter a minimum compensation greater than zero.'
  }
  if (!Number.isFinite(salaryMax) || salaryMax <= 0) {
    errors.salaryMax = 'Enter a maximum compensation greater than zero.'
  } else if (Number.isFinite(salaryMin) && salaryMin > salaryMax) {
    errors.salaryMax = 'Maximum compensation must be at least the minimum.'
  }

  if (!/^[A-Z]{3}$/i.test(values.salaryCurrency.trim())) {
    errors.salaryCurrency = 'Enter a three-letter currency code, such as USD or NGN.'
  }
  if (!salaryPeriods.has(values.salaryPeriod)) {
    errors.salaryPeriod = 'Select hourly, weekly, bi-weekly, or monthly compensation.'
  }
  checkText(errors, 'timeZone', values.timeZone, 'Time zone', 100)

  if (values.roleDetails.trim().length > 2000) {
    errors.roleDetails = 'Role details must be 2000 characters or fewer.'
  }
  if (!values.privacyConsent) {
    errors.privacyConsent = 'Acknowledge the privacy notice to continue.'
  }

  return errors
}

export function validateContactMessage(values: ContactMessageValues): FormErrors {
  const errors: FormErrors = {}
  checkText(errors, 'name', values.name, 'Name', 120)
  checkEmail(errors, 'email', values.email, 'email address')
  checkText(errors, 'subject', values.subject, 'Subject', 120)

  if (values.message.trim().length < 20) {
    errors.message = 'Please write at least 20 characters.'
  } else if (values.message.trim().length > 3000) {
    errors.message = 'Your message must be 3000 characters or fewer.'
  }
  if (!values.privacyConsent) {
    errors.privacyConsent = 'Acknowledge the privacy notice to continue.'
  }

  return errors
}
