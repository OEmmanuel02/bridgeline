import { z } from 'zod'

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase())

const candidateRole = z
  .enum(['customer-support', 'virtual-assistance', 'operations-support'])
  .transform((value) => {
    if (value === 'customer-support') return 'CUSTOMER_SUPPORT'
    if (value === 'virtual-assistance') return 'VIRTUAL_ASSISTANCE'
    return 'OPERATIONS_SUPPORT'
  })
const compensationPeriods = {
  hourly: 'HOURLY',
  weekly: 'WEEKLY',
  'bi-weekly': 'BIWEEKLY',
  monthly: 'MONTHLY',
} as const

const privacyConsent = z.literal(true, {
  error: 'You must acknowledge the privacy notice before submitting.',
})

export const candidateApplicationSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s().-]+$/)
      .refine((value) => {
        const digits = value.replace(/\D/g, '')
        return digits.length >= 7 && digits.length <= 15
      }),
    city: z.string().trim().min(1).max(100),
    educationLevel: z.string().trim().min(1).max(80),
    currentSkills: z.string().trim().min(1).max(1200),
    roleInterest: candidateRole,
    remoteWorkReason: z.string().trim().min(30).max(1200),
    privacyConsent,
  })
  .strict()

export const hiringRequestSchema = z
  .object({
    companyName: z.string().trim().min(1).max(160),
    contactName: z.string().trim().min(1).max(120),
    contactEmail: email,
    roleNeeded: candidateRole,
    hireCount: z.coerce.number().int().min(1).max(1000),
    salaryMin: z.coerce.number().finite().positive().max(9999999999999.99),
    salaryMax: z.coerce.number().finite().positive().max(9999999999999.99),
    salaryCurrency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/i)
      .transform((value) => value.toUpperCase()),
    salaryPeriod: z
      .enum(['hourly', 'weekly', 'bi-weekly', 'monthly'])
      .transform((value) => compensationPeriods[value]),
    timeZone: z.string().trim().min(1).max(100),
    roleDetails: z.string().trim().max(2000).optional().default(''),
    privacyConsent,
  })
  .strict()
  .refine((values) => values.salaryMin <= values.salaryMax, {
    message: 'Maximum compensation must be at least the minimum.',
    path: ['salaryMax'],
  })

export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email,
    subject: z.string().trim().min(1).max(120),
    message: z.string().trim().min(20).max(3000),
    privacyConsent,
  })
  .strict()

const password = z
  .string()
  .min(12)
  .max(72)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be no more than 72 bytes.',
  })

export const candidateRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email,
    password,
    privacyConsent,
    role: z.literal('candidate').optional(),
  })
  .strict()

export const employerRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email,
    password,
    companyName: z.string().trim().min(1).max(160),
    privacyConsent,
    role: z.literal('employer').optional(),
  })
  .strict()

export const loginSchema = z
  .object({
    email,
    password,
  })
  .strict()

const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s().-]+$/)
  .refine((value) => {
    const digits = value.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  })

export const candidateProfilePatchSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: phone.nullable().optional(),
    city: z.string().trim().min(1).max(100).nullable().optional(),
    educationLevel: z.string().trim().min(1).max(80).nullable().optional(),
    currentSkills: z.string().trim().min(1).max(1200).nullable().optional(),
    roleInterest: z
      .enum(['CUSTOMER_SUPPORT', 'VIRTUAL_ASSISTANCE', 'OPERATIONS_SUPPORT'])
      .nullable()
      .optional(),
  })
  .strict()
  .refine((values) => Object.keys(values).length > 0, {
    message: 'Provide at least one profile field to update.',
  })

export const candidateVisibilitySchema = z.object({ consent: z.boolean() }).strict()

export const employerProfilePatchSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    companyName: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
  .refine((values) => Object.keys(values).length > 0, {
    message: 'Provide at least one profile field to update.',
  })

export const applicationStatusSchema = z
  .object({
    status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_TRAINING']),
    internalReviewNote: z.string().trim().max(2000).optional(),
  })
  .strict()

export const trainingProgressSchema = z
  .object({
    percentage: z.number().int().min(0).max(100),
    internalNote: z.string().trim().max(1000).optional(),
  })
  .strict()

export const assessmentResultSchema = z
  .object({
    status: z.enum(['PASSED', 'FAILED']),
    score: z.number().min(0).max(100).optional(),
    internalNote: z.string().trim().max(1000).optional(),
  })
  .strict()

export const hiringRequestStatusSchema = z
  .object({ status: z.enum(['UNDER_REVIEW', 'IN_PROGRESS', 'FILLED', 'CLOSED']) })
  .strict()

export const createMatchSchema = z
  .object({
    candidateApplicationId: z.uuid(),
    hiringRequestId: z.uuid(),
  })
  .strict()

export const createPlacementSchema = z
  .object({
    candidateApplicationId: z.uuid(),
    hiringRequestId: z.uuid(),
    internalNote: z.string().trim().max(1000).optional(),
  })
  .strict()

export const applicationListQuerySchema = z
  .object({
    status: z
      .enum([
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'IN_TRAINING',
        'ASSESSMENT',
        'READY_FOR_MATCHING',
        'PLACED',
      ])
      .optional(),
  })
  .strict()

export const hiringRequestListQuerySchema = z
  .object({
    status: z
      .enum(['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'FILLED', 'CLOSED'])
      .optional(),
  })
  .strict()

export const passwordSchema = password

export type CandidateApplicationInput = z.infer<typeof candidateApplicationSchema>
export type HiringRequestInput = z.infer<typeof hiringRequestSchema>
export type ContactMessageInput = z.infer<typeof contactMessageSchema>
export type CandidateRegistrationInput = z.infer<typeof candidateRegistrationSchema>
export type EmployerRegistrationInput = z.infer<typeof employerRegistrationSchema>
