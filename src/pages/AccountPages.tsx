import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { type FormErrors } from '../lib/formValidation'
import { ApiRequestError, publicRegistrationEnabled } from '../lib/api'
import { useSession } from '../lib/useSession'
import { ArrowIcon, Eyebrow, PublicPageFrame, Wordmark } from '../components/SiteChrome'
import { ErrorSummary, FormField, PrivacyNotice } from './PublicForms'
import { readFormValue } from './formUtils'

const DashboardPage = lazy(() =>
  import('./DashboardPage').then((module) => ({ default: module.DashboardPage })),
)

export function AuthPage({ mode }: { mode: 'login' | 'candidate' | 'employer' }) {
  const { user, isLoading, sessionError, signIn, register } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [errors, setErrors] = useState<FormErrors>({})
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistration = mode !== 'login'

  if (user) return <Navigate replace to="/account" />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setRequestError('')
    const data = new FormData(event.currentTarget)
    const values: Record<string, string | boolean> = {
      fullName: readFormValue(data, 'fullName').trim(),
      email: readFormValue(data, 'email').trim(),
      password: readFormValue(data, 'password'),
      privacyConsent: data.get('privacyConsent') === 'on',
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email))) {
      setErrors({ email: 'Enter a valid email address.' })
      return
    }
    if (
      String(values.password).length < 12 ||
      String(values.password).length > 72 ||
      new TextEncoder().encode(String(values.password)).length > 72
    ) {
      setErrors({ password: 'Use a password between 12 and 72 characters.' })
      return
    }
    if (isRegistration && !values.fullName) {
      setErrors({ fullName: 'Full name is required.' })
      return
    }
    if (isRegistration && !values.privacyConsent) {
      setErrors({ privacyConsent: 'Acknowledge the privacy notice to continue.' })
      return
    }

    if (mode === 'employer') {
      const companyName = readFormValue(data, 'companyName').trim()
      if (!companyName || companyName.length > 160) {
        setErrors({ companyName: 'Enter a company name of 160 characters or fewer.' })
        return
      }
      values.companyName = companyName
    }

    if (isRegistration && !publicRegistrationEnabled) {
      setRequestError('Online account registration is disabled until the privacy notice is finalized.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(String(values.email), String(values.password))
      } else {
        await register(mode, values)
      }

      const requestedPath = searchParams.get('next')
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/account'
      navigate(destination, { replace: true })
    } catch (error) {
      setRequestError(
        error instanceof ApiRequestError
          ? error.message
          : 'We could not reach the account service. Your entries are still here; try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const pageTitle =
    mode === 'login'
      ? 'Welcome back.'
      : mode === 'candidate'
        ? 'Create your candidate account.'
        : 'Create your employer account.'

  return (
    <PublicPageFrame>
      <section className="public-section auth-section">
        <div className="content-width auth-layout">
          <div className="auth-intro">
            <Eyebrow>{isRegistration ? 'Create an account' : 'Account access'}</Eyebrow>
            <h1>{pageTitle}</h1>
            <p>
              {mode === 'candidate'
                ? 'Candidate accounts are for managing your own future application and profile.'
                : mode === 'employer'
                  ? 'Employer accounts are for managing your company profile and hiring requests.'
                  : 'Sign in to continue to your Bridgeline account.'}
            </p>
            {mode === 'login' ? (
              <div className="auth-intro__links">
                <Link to="/register/candidate">Create a candidate account</Link>
                <Link to="/register/employer">Create an employer account</Link>
              </div>
            ) : (
              <p className="auth-intro__switch">
                Already registered? <Link to="/login">Sign in</Link>
              </p>
            )}
          </div>
          <form className="application-form auth-form" noValidate onSubmit={handleSubmit}>
            {isLoading && <p className="auth-form__loading">Checking your existing session…</p>}
            {!isLoading && sessionError && mode === 'login' && (
              <div className="form-notice form-notice--error" role="status">
                <strong>Account service status</strong>
                <span>{sessionError}</span>
              </div>
            )}
            <ErrorSummary errors={errors} />
            {isRegistration && (
              <FormField error={errors.fullName} id="fullName" label="Full name" required>
                <input
                  autoComplete="name"
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  aria-invalid={Boolean(errors.fullName)}
                  id="fullName"
                  maxLength={120}
                  name="fullName"
                  required
                />
              </FormField>
            )}
            {mode === 'employer' && (
              <FormField
                error={errors.companyName}
                id="companyName"
                label="Company name"
                required
              >
                <input
                  autoComplete="organization"
                  aria-describedby={errors.companyName ? 'companyName-error' : undefined}
                  aria-invalid={Boolean(errors.companyName)}
                  id="companyName"
                  maxLength={160}
                  name="companyName"
                  required
                />
              </FormField>
            )}
            <FormField error={errors.email} id="email" label="Email address" required>
              <input
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                id="email"
                maxLength={254}
                name="email"
                required
                type="email"
              />
            </FormField>
            <FormField
              error={errors.password}
              hint=              {isRegistration ? 'Use 12–72 characters.' : undefined}
              id="password"
              label="Password"
              required
            >
              <input
                autoComplete={isRegistration ? 'new-password' : 'current-password'}
                aria-describedby={
                  errors.password
                    ? isRegistration
                      ? 'password-hint password-error'
                      : 'password-error'
                    : isRegistration
                      ? 'password-hint'
                      : undefined
                }
                aria-invalid={Boolean(errors.password)}
                id="password"
                maxLength={72}
                minLength={isRegistration ? 12 : undefined}
                name="password"
                required
                type="password"
              />
            </FormField>
            {isRegistration && (
              <PrivacyNotice error={errors.privacyConsent} id="account-privacy-consent" />
            )}
            {isRegistration && !publicRegistrationEnabled && (
              <p className="form-privacy-note">
                Online account registration is currently disabled. No account data will be sent or
                saved.
              </p>
            )}
            {requestError && (
              <div className="form-notice form-notice--error" role="alert">
                <strong>We couldn&apos;t complete that request.</strong>
                <span>{requestError}</span>
              </div>
            )}
            <button
              className="button button--dark form-submit"
              disabled={isLoading || isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? 'Please wait…'
                : isRegistration
                  ? 'Create account'
                  : 'Sign in'}
              <ArrowIcon />
            </button>
            {mode === 'login' && (
              <p className="form-submit__note">
                Password recovery is not available yet. Contact details are shown on the contact page.
              </p>
            )}
          </form>
        </div>
      </section>
    </PublicPageFrame>
  )
}

export function ProtectedAccountPage() {
  const { user, isLoading, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <main className="account-loading" aria-live="polite">
        Checking your session…
      </main>
    )
  }
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate replace to={`/login?next=${next}`} />
  }

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Sign out could not be completed. Try again.',
      )
    }
  }

  return (
    <PublicPageFrame>
      {signOutError && (
        <p className="dashboard-alert dashboard-alert--error" role="alert">
          {signOutError}
        </p>
      )}
      <Suspense
        fallback={
          <section className="dashboard-page" aria-live="polite">
            <div className="dashboard-container">Loading your workspace…</div>
          </section>
        }
      >
        <DashboardPage onSignOut={() => void handleSignOut()} />
      </Suspense>
    </PublicPageFrame>
  )
}

export function PrivacyPage() {
  return (
    <PublicPageFrame>
      <section className="public-section privacy-page">
        <div className="content-width">
          <Eyebrow>Privacy information · Draft</Eyebrow>
          <h1>Privacy comes before submission.</h1>
          <p className="privacy-page__lead">
            This is a preliminary project notice, not a final privacy policy or a claim of legal
            compliance. Online account registration and public form submissions are disabled by
            default.
          </p>
          <div className="privacy-page__body">
            <section>
              <h2>Information the forms may ask for</h2>
              <p>
                Candidate forms ask for contact details, city, education level, skills, role
                interest, and a short explanation of interest in remote work. Employer forms ask
                for company and contact details, hiring needs, compensation range, currency, pay
                period, and time zone. Contact forms ask for name, email, subject, and message.
              </p>
            </section>
            <section>
              <h2>Why it would be used</h2>
              <p>
                If submissions are enabled after review, information would be used to review a
                candidate application, respond to a hiring request or contact message, and operate
                the related account. Candidate details are not automatically made public or shared
                with employers.
              </p>
            </section>
            <section>
              <h2>Access, storage, and retention</h2>
              <p>
                The planned service stores submissions in PostgreSQL and restricts application
                access by role. A final retention schedule, deletion process, contact channel, and
                all operational safeguards must be established before collecting real submissions.
              </p>
            </section>
            <section>
              <h2>Before this notice is put into effect</h2>
              <p>
                Bridgeline must supply confirmed contact details, determine the applicable
                jurisdiction-specific requirements, and have this notice reviewed and finalized.
                Do not submit sensitive personal information. No legal-compliance certification
                is made by this draft.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PublicPageFrame>
  )
}
export function UnavailablePage() {
  const location = useLocation()
  const labels: Record<string, string> = {
    '/candidates': 'For candidates',
    '/employers': 'For employers',
    '/about': 'About Bridgeline',
    '/contact': 'Contact',
    '/terms': 'Terms',
  }
  const pageName = labels[location.pathname] ?? 'This page'

  return (
    <main className="unavailable-page">
      <Wordmark />
      <div>
        <Eyebrow>Coming in a later phase</Eyebrow>
        <h1>{pageName} is not available yet.</h1>
        <p>
          This part of Bridgeline is planned, but it is not available yet. No application or
          hiring request has been submitted.
        </p>
        <Link className="button button--gold" to="/">
          Return to the homepage <ArrowIcon />
        </Link>
      </div>
    </main>
  )
}
