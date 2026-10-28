import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  validateCandidateApplication,
  validateContactMessage,
  validateHiringRequest,
  type CandidateApplicationValues,
  type ContactMessageValues,
  type FormErrors,
  type HiringRequestValues,
} from '../lib/formValidation'
import { ApiRequestError, publicSubmissionsEnabled, submitPublicForm } from '../lib/api'
import { useSession } from '../lib/useSession'
import { ArrowIcon } from '../components/SiteChrome'
import { readFormValue } from './formUtils'

export function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  wide = false,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`form-field${wide ? ' form-field--wide' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="form-field__required">Required</span>}
      </label>
      {children}
      {hint && (
        <p className="form-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="form-field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export function ErrorSummary({ errors }: { errors: FormErrors }) {
  const entries = Object.entries(errors)
  if (entries.length === 0) return null

  return (
    <div className="form-error-summary" role="alert">
      <p>Review these details before continuing:</p>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={field === 'privacyConsent' ? '#privacyConsent' : `#${field}`}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'disabled' | 'error'

function SubmissionNotice({
  state,
  message,
}: {
  state: SubmissionState
  message: string
}) {
  if (state === 'idle') return null

  const heading = {
    submitting: 'Sending securely…',
    success: 'Submission received.',
    disabled: 'Nothing was sent.',
    error: 'Submission failed.',
    idle: '',
  }[state]

  return (
    <div
      className={`form-notice form-notice--${state}`}
      role={state === 'error' ? 'alert' : 'status'}
      tabIndex={-1}
    >
      <strong>{heading}</strong>
      <span>{message}</span>
    </div>
  )
}

export function PrivacyNotice({ id, error }: { id: string; error?: string }) {
  return (
    <div className="privacy-consent">
      <div>
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          id="privacyConsent"
          name="privacyConsent"
          required
          type="checkbox"
        />
        <label htmlFor="privacyConsent">
          I have read the <Link to="/privacy">privacy information</Link> and agree to the use of
          my details for this submission.
        </label>
      </div>
      {error && (
        <p className="form-field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
      {!publicSubmissionsEnabled && (
        <p className="form-privacy-note">
          Online submissions are currently disabled. Nothing you enter will be sent or stored.
        </p>
      )}
    </div>
  )
}

function usePublicForm<T extends { privacyConsent: boolean }>(
  endpoint: 'applications' | 'hiring-requests' | 'contact',
  validate: (values: T) => FormErrors,
) {
  const { accessToken } = useSession()
  const [errors, setErrors] = useState<FormErrors>({})
  const [state, setState] = useState<SubmissionState>('idle')
  const [message, setMessage] = useState('')

  async function submit(values: T) {
    setState('idle')
    setMessage('')
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    if (!publicSubmissionsEnabled) {
      setState('disabled')
      setMessage(
        'The form passed local checks, but online submissions are disabled. Your information has not been submitted or saved.',
      )
      return
    }

    setState('submitting')
    try {
      const response = await submitPublicForm(endpoint, values, accessToken)
      setState('success')
      setMessage(`Your information was received. Reference: ${response.data.id}`)
    } catch (error) {
      setState('error')
      setMessage(
        error instanceof ApiRequestError
          ? error.message
          : 'We could not reach the submission service. Your answers are still on this page; please try again.',
      )
    }
  }

  return { errors, state, message, submit }
}



export function CandidateApplicationForm() {
  const form = usePublicForm('applications', validateCandidateApplication)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: CandidateApplicationValues = {
      fullName: readFormValue(data, 'fullName'),
      email: readFormValue(data, 'email'),
      phone: readFormValue(data, 'phone'),
      city: readFormValue(data, 'city'),
      educationLevel: readFormValue(data, 'educationLevel'),
      currentSkills: readFormValue(data, 'currentSkills'),
      roleInterest: readFormValue(data, 'roleInterest'),
      remoteWorkReason: readFormValue(data, 'remoteWorkReason'),
      privacyConsent: data.get('privacyConsent') === 'on',
    }
    await form.submit(values)
  }

  return (
    <form className="application-form" noValidate onSubmit={handleSubmit}>
      <ErrorSummary errors={form.errors} />
      <div className="form-grid">
        <FormField error={form.errors.fullName} id="fullName" label="Full name" required>
          <input
            autoComplete="name"
            aria-describedby={form.errors.fullName ? 'fullName-error' : undefined}
            aria-invalid={Boolean(form.errors.fullName)}
            id="fullName"
            maxLength={120}
            name="fullName"
            required
          />
        </FormField>
        <FormField error={form.errors.email} id="email" label="Email address" required>
          <input
            autoComplete="email"
            aria-describedby={form.errors.email ? 'email-error' : undefined}
            aria-invalid={Boolean(form.errors.email)}
            id="email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </FormField>
        <FormField
          error={form.errors.phone}
          hint="Include a country code if you have one."
          id="phone"
          label="Phone number"
          required
        >
          <input
            autoComplete="tel"
            aria-describedby={form.errors.phone ? 'phone-hint phone-error' : 'phone-hint'}
            aria-invalid={Boolean(form.errors.phone)}
            id="phone"
            inputMode="tel"
            maxLength={30}
            name="phone"
            required
            type="tel"
          />
        </FormField>
        <FormField error={form.errors.city} id="city" label="City" required>
          <input
            autoComplete="address-level2"
            aria-describedby={form.errors.city ? 'city-error' : undefined}
            aria-invalid={Boolean(form.errors.city)}
            id="city"
            maxLength={100}
            name="city"
            required
          />
        </FormField>
        <FormField
          error={form.errors.educationLevel}
          id="educationLevel"
          label="Education level"
          required
        >
          <select
            aria-describedby={
              form.errors.educationLevel ? 'educationLevel-error' : undefined
            }
            aria-invalid={Boolean(form.errors.educationLevel)}
            defaultValue=""
            id="educationLevel"
            name="educationLevel"
            required
          >
            <option disabled value="">
              Choose an option
            </option>
            <option value="secondary">Secondary school</option>
            <option value="certificate">Certificate or vocational training</option>
            <option value="undergraduate">Some university study</option>
            <option value="bachelors">Bachelor&apos;s degree</option>
            <option value="postgraduate">Postgraduate study</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </FormField>
        <FormField
          error={form.errors.roleInterest}
          id="roleInterest"
          label="Role of interest"
          required
        >
          <select
            aria-describedby={form.errors.roleInterest ? 'roleInterest-error' : undefined}
            aria-invalid={Boolean(form.errors.roleInterest)}
            defaultValue=""
            id="roleInterest"
            name="roleInterest"
            required
          >
            <option disabled value="">
              Choose an area
            </option>
            <option value="customer-support">Customer support</option>
            <option value="virtual-assistance">Virtual assistance</option>
            <option value="operations-support">Operations support</option>
          </select>
        </FormField>
        <FormField
          error={form.errors.currentSkills}
          hint="Share relevant strengths, tools, or experience."
          id="currentSkills"
          label="Current skills"
          required
          wide
        >
          <textarea
            aria-describedby={
              form.errors.currentSkills
                ? 'currentSkills-hint currentSkills-error'
                : 'currentSkills-hint'
            }
            aria-invalid={Boolean(form.errors.currentSkills)}
            id="currentSkills"
            maxLength={1200}
            name="currentSkills"
            required
            rows={4}
          />
        </FormField>
        <FormField
          error={form.errors.remoteWorkReason}
          hint="Please write 30–1,200 characters."
          id="remoteWorkReason"
          label="Why are you interested in remote work?"
          required
          wide
        >
          <textarea
            aria-describedby={
              form.errors.remoteWorkReason
                ? 'remoteWorkReason-hint remoteWorkReason-error'
                : 'remoteWorkReason-hint'
            }
            aria-invalid={Boolean(form.errors.remoteWorkReason)}
            id="remoteWorkReason"
            maxLength={1200}
            name="remoteWorkReason"
            required
            rows={5}
          />
        </FormField>
      </div>
      <PrivacyNotice error={form.errors.privacyConsent} id="candidate-privacy-consent" />
      <SubmissionNotice message={form.message} state={form.state} />
      <button className="button button--dark form-submit" disabled={form.state === 'submitting'} type="submit">
        {form.state === 'submitting' ? 'Submitting…' : 'Submit application'} <ArrowIcon />
      </button>
      <p className="form-submit__note">Applying is free. No fee is required to apply.</p>
    </form>
  )
}

export function HiringRequestForm() {
  const form = usePublicForm('hiring-requests', validateHiringRequest)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: HiringRequestValues = {
      companyName: readFormValue(data, 'companyName'),
      contactName: readFormValue(data, 'contactName'),
      contactEmail: readFormValue(data, 'contactEmail'),
      roleNeeded: readFormValue(data, 'roleNeeded'),
      hireCount: readFormValue(data, 'hireCount'),
      salaryMin: readFormValue(data, 'salaryMin'),
      salaryMax: readFormValue(data, 'salaryMax'),
      salaryCurrency: readFormValue(data, 'salaryCurrency'),
      salaryPeriod: readFormValue(data, 'salaryPeriod'),
      timeZone: readFormValue(data, 'timeZone'),
      roleDetails: readFormValue(data, 'roleDetails'),
      privacyConsent: data.get('privacyConsent') === 'on',
    }
    await form.submit(values)
  }

  return (
    <form className="application-form" noValidate onSubmit={handleSubmit}>
      <ErrorSummary errors={form.errors} />
      <div className="form-grid">
        <FormField error={form.errors.companyName} id="companyName" label="Company name" required>
          <input
            aria-describedby={form.errors.companyName ? 'companyName-error' : undefined}
            aria-invalid={Boolean(form.errors.companyName)}
            autoComplete="organization"
            id="companyName"
            maxLength={160}
            name="companyName"
            required
          />
        </FormField>
        <FormField error={form.errors.contactName} id="contactName" label="Your name" required>
          <input
            aria-describedby={form.errors.contactName ? 'contactName-error' : undefined}
            aria-invalid={Boolean(form.errors.contactName)}
            autoComplete="name"
            id="contactName"
            maxLength={120}
            name="contactName"
            required
          />
        </FormField>
        <FormField
          error={form.errors.contactEmail}
          id="contactEmail"
          label="Work email"
          required
        >
          <input
            aria-describedby={form.errors.contactEmail ? 'contactEmail-error' : undefined}
            aria-invalid={Boolean(form.errors.contactEmail)}
            autoComplete="email"
            id="contactEmail"
            maxLength={254}
            name="contactEmail"
            required
            type="email"
          />
        </FormField>
        <FormField error={form.errors.roleNeeded} id="roleNeeded" label="Role needed" required>
          <select
            aria-describedby={form.errors.roleNeeded ? 'roleNeeded-error' : undefined}
            aria-invalid={Boolean(form.errors.roleNeeded)}
            defaultValue=""
            id="roleNeeded"
            name="roleNeeded"
            required
          >
            <option disabled value="">
              Choose a role
            </option>
            <option value="customer-support">Customer support</option>
            <option value="virtual-assistance">Virtual assistance</option>
            <option value="operations-support">Operations support</option>
          </select>
        </FormField>
        <FormField
          error={form.errors.hireCount}
          hint="Enter a whole number."
          id="hireCount"
          label="Number of hires"
          required
        >
          <input
            aria-describedby={
              form.errors.hireCount ? 'hireCount-hint hireCount-error' : 'hireCount-hint'
            }
            aria-invalid={Boolean(form.errors.hireCount)}
            id="hireCount"
            min="1"
            name="hireCount"
            required
            step="1"
            type="number"
          />
        </FormField>
        <FormField error={form.errors.timeZone} id="timeZone" label="Time zone" required>
          <input
            aria-describedby={form.errors.timeZone ? 'timeZone-error' : undefined}
            aria-invalid={Boolean(form.errors.timeZone)}
            autoComplete="off"
            id="timeZone"
            maxLength={100}
            name="timeZone"
            placeholder="e.g. UTC−5 or America/New_York"
            required
          />
        </FormField>
        <fieldset className="form-field form-field--salary">
          <legend>
            Compensation range <span className="form-field__required">Required</span>
          </legend>
          <div className="salary-fields">
            <FormField error={form.errors.salaryMin} id="salaryMin" label="Minimum" required>
              <input
                aria-describedby={form.errors.salaryMin ? 'salaryMin-error' : undefined}
                aria-invalid={Boolean(form.errors.salaryMin)}
                id="salaryMin"
                min="0"
                name="salaryMin"
                required
                step="any"
                type="number"
              />
            </FormField>
            <FormField error={form.errors.salaryMax} id="salaryMax" label="Maximum" required>
              <input
                aria-describedby={form.errors.salaryMax ? 'salaryMax-error' : undefined}
                aria-invalid={Boolean(form.errors.salaryMax)}
                id="salaryMax"
                min="0"
                name="salaryMax"
                required
                step="any"
                type="number"
              />
            </FormField>
          </div>
        </fieldset>
        <FormField
          error={form.errors.salaryCurrency}
          hint="Use a three-letter currency code, for example USD, GBP, or NGN."
          id="salaryCurrency"
          label="Currency"
          required
        >
          <input
            aria-describedby={
              form.errors.salaryCurrency
                ? 'salaryCurrency-hint salaryCurrency-error'
                : 'salaryCurrency-hint'
            }
            aria-invalid={Boolean(form.errors.salaryCurrency)}
            autoCapitalize="characters"
            id="salaryCurrency"
            maxLength={3}
            name="salaryCurrency"
            placeholder="USD"
            required
          />
        </FormField>
        <FormField
          error={form.errors.salaryPeriod}
          hint="Choose how often the stated compensation is paid."
          id="salaryPeriod"
          label="Pay period"
          required
        >
          <select
            aria-describedby={
              form.errors.salaryPeriod ? 'salaryPeriod-hint salaryPeriod-error' : 'salaryPeriod-hint'
            }
            aria-invalid={Boolean(form.errors.salaryPeriod)}
            defaultValue=""
            id="salaryPeriod"
            name="salaryPeriod"
            required
          >
            <option disabled value="">
              Choose a pay period
            </option>
            <option value="hourly">Hourly</option>
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </FormField>
        <FormField
          error={form.errors.roleDetails}
          hint="Describe responsibilities or requirements that will help us understand the role."
          id="roleDetails"
          label="Role details (optional)"
          wide
        >
          <textarea
            aria-describedby={
              form.errors.roleDetails ? 'roleDetails-hint roleDetails-error' : 'roleDetails-hint'
            }
            aria-invalid={Boolean(form.errors.roleDetails)}
            id="roleDetails"
            maxLength={2000}
            name="roleDetails"
            rows={4}
          />
        </FormField>
      </div>
      <PrivacyNotice error={form.errors.privacyConsent} id="employer-privacy-consent" />
      <SubmissionNotice message={form.message} state={form.state} />
      <button className="button button--dark form-submit" disabled={form.state === 'submitting'} type="submit">
        {form.state === 'submitting' ? 'Submitting…' : 'Submit hiring request'} <ArrowIcon />
      </button>
      <p className="form-submit__note">
        Submitting a request does not create a hiring commitment or confirm an active vacancy.
      </p>
    </form>
  )
}

export function ContactMessageForm() {
  const form = usePublicForm('contact', validateContactMessage)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: ContactMessageValues = {
      name: readFormValue(data, 'name'),
      email: readFormValue(data, 'email'),
      subject: readFormValue(data, 'subject'),
      message: readFormValue(data, 'message'),
      privacyConsent: data.get('privacyConsent') === 'on',
    }
    await form.submit(values)
  }

  return (
    <form className="application-form contact-form" noValidate onSubmit={handleSubmit}>
      <ErrorSummary errors={form.errors} />
      <FormField error={form.errors.name} id="name" label="Name" required>
        <input
          aria-describedby={form.errors.name ? 'name-error' : undefined}
          aria-invalid={Boolean(form.errors.name)}
          autoComplete="name"
          id="name"
          maxLength={120}
          name="name"
          required
        />
      </FormField>
      <FormField error={form.errors.email} id="email" label="Email address" required>
        <input
          aria-describedby={form.errors.email ? 'email-error' : undefined}
          aria-invalid={Boolean(form.errors.email)}
          autoComplete="email"
          id="email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </FormField>
      <FormField error={form.errors.subject} id="subject" label="Subject" required>
        <input
          aria-describedby={form.errors.subject ? 'subject-error' : undefined}
          aria-invalid={Boolean(form.errors.subject)}
          id="subject"
          maxLength={120}
          name="subject"
          required
        />
      </FormField>
      <FormField
        error={form.errors.message}
        hint="Please write 20–3,000 characters."
        id="message"
        label="Message"
        required
      >
        <textarea
          aria-describedby={
            form.errors.message ? 'message-hint message-error' : 'message-hint'
          }
          aria-invalid={Boolean(form.errors.message)}
          id="message"
          maxLength={3000}
          name="message"
          required
          rows={6}
        />
      </FormField>
      <PrivacyNotice error={form.errors.privacyConsent} id="contact-privacy-consent" />
      <SubmissionNotice message={form.message} state={form.state} />
      <button className="button button--dark form-submit" disabled={form.state === 'submitting'} type="submit">
        {form.state === 'submitting' ? 'Submitting…' : 'Send message'} <ArrowIcon />
      </button>
    </form>
  )
}
