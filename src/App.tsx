import { Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider } from './lib/session-provider'
import { HomePage } from './pages/HomePage'
import { AboutPage, CandidatesPage, ContactPage, EmployersPage } from './pages/PublicPages'
import { AuthPage, ProtectedAccountPage, PrivacyPage, UnavailablePage } from './pages/AccountPages'
import './App.css'

const routeMetadata: Record<
  string,
  { title: string; description: string; index: boolean }
> = {
  '/': {
    title: 'Bridgeline — Train here. Work anywhere.',
    description:
      'Bridgeline prepares Nigerian talent for remote work and connects qualified candidates with international employers.',
    index: true,
  },
  '/candidates': {
    title: 'For Candidates | Bridgeline',
    description:
      'Explore Bridgeline training and remote-work opportunities for Nigerian candidates. Training does not guarantee placement.',
    index: true,
  },
  '/employers': {
    title: 'For Employers | Bridgeline',
    description:
      'Connect with prepared Nigerian remote talent in customer support, virtual assistance, and operations support.',
    index: true,
  },
  '/about': {
    title: 'About Bridgeline',
    description:
      'Learn about Bridgeline’s goal of creating a considered path between Nigerian talent and global remote work.',
    index: true,
  },
  '/contact': {
    title: 'Contact Bridgeline',
    description: 'Contact Bridgeline with questions about candidate training or hiring.',
    index: true,
  },
  '/privacy': {
    title: 'Draft Privacy Notice | Bridgeline',
    description:
      'The Bridgeline privacy notice is a draft and must be reviewed before online submissions are enabled.',
    index: false,
  },
  '/login': {
    title: 'Sign In | Bridgeline',
    description: 'Sign in to your Bridgeline account.',
    index: false,
  },
  '/register/candidate': {
    title: 'Candidate Registration | Bridgeline',
    description: 'Create a candidate account with Bridgeline.',
    index: false,
  },
  '/register/employer': {
    title: 'Employer Registration | Bridgeline',
    description: 'Create an employer account with Bridgeline.',
    index: false,
  },
  '/account': {
    title: 'Account Workspace | Bridgeline',
    description: 'Manage your private Bridgeline account workspace.',
    index: false,
  },
}
function RouteMetadata() {
  const location = useLocation()

  useEffect(() => {
    const metadata = routeMetadata[location.pathname] ?? {
      title: 'Page Not Found | Bridgeline',
      description: 'The requested Bridgeline page could not be found.',
      index: false,
    }
    document.title = metadata.title
    document.getElementById('page-description')?.setAttribute('content', metadata.description)
    document.getElementById('page-robots')?.setAttribute(
      'content',
      metadata.index ? 'index,follow' : 'noindex,nofollow',
    )
    document.getElementById('page-og-title')?.setAttribute('content', metadata.title)
    document.getElementById('page-og-description')?.setAttribute('content', metadata.description)

    const canonical = document.getElementById('canonical-url') as HTMLLinkElement | null
    const siteUrl = import.meta.env.VITE_SITE_URL
    if (!canonical || !siteUrl || !metadata.index) {
      canonical?.removeAttribute('href')
      return
    }
    try {
      const baseUrl = new URL(siteUrl)
      canonical.href = new URL(location.pathname, baseUrl).toString()
    } catch {
      canonical.removeAttribute('href')
    }
  }, [location.pathname])

  return null
}
function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <RouteMetadata />
        <Suspense
          fallback={
            <main className="account-loading" aria-live="polite">
              Loading page…
            </main>
          }
        >
          <Routes>
            <Route element={<HomePage />} path="/" />
            <Route element={<CandidatesPage />} path="/candidates" />
            <Route element={<EmployersPage />} path="/employers" />
            <Route element={<AboutPage />} path="/about" />
            <Route element={<ContactPage />} path="/contact" />
            <Route element={<PrivacyPage />} path="/privacy" />
            <Route element={<AuthPage mode="login" />} path="/login" />
            <Route element={<AuthPage mode="candidate" />} path="/register/candidate" />
            <Route element={<AuthPage mode="employer" />} path="/register/employer" />
            <Route element={<ProtectedAccountPage />} path="/account" />
            <Route element={<UnavailablePage />} path="*" />
          </Routes>
        </Suspense>
      </SessionProvider>
    </BrowserRouter>
  )
}

export default App
