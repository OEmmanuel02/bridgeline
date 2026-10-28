import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/useSession'

const currentYear = new Date().getFullYear()

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'For candidates', href: '/candidates' },
  { label: 'For employers', href: '/employers' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={diagonal ? 'arrow-icon arrow-icon--diagonal' : 'arrow-icon'}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M3.5 10h12m-5-5 5 5-5 5" />
    </svg>
  )
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link
      aria-label="Bridgeline home"
      className={`wordmark${light ? ' wordmark--light' : ''}`}
      to="/"
    >
      <span className="wordmark__symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>bridgeline</span>
    </Link>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24)
  const { user } = useSession()

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <div className="site-header__inner">
        <Wordmark light />
        <button
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`menu-toggle${menuOpen ? ' menu-toggle--open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
        </button>
        <nav
          aria-label="Main navigation"
          className={`primary-navigation${menuOpen ? ' primary-navigation--open' : ''}`}
          id="primary-navigation"
        >
          <div className="primary-navigation__links">
            {navigation.map((item) => (
              <Link key={item.href} onClick={() => setMenuOpen(false)} to={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            className="primary-navigation__signin"
            onClick={() => setMenuOpen(false)}
            to={user ? '/account' : '/login'}
          >
            {user ? 'My account' : 'Sign in'}
          </Link>
          <Link
            className="button button--small button--gold"
            onClick={() => setMenuOpen(false)}
            to="/candidates"
          >
            Apply as a candidate <ArrowIcon diagonal />
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`eyebrow${light ? ' eyebrow--light' : ''}`}>{children}</p>
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  light = false,
}: {
  eyebrow: string
  title: string
  children?: string
  light?: boolean
}) {
  return (
    <div className={`section-heading${light ? ' section-heading--light' : ''}`}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {children && <p className="section-heading__copy">{children}</p>}
    </div>
  )
}
export function PublicPageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main className="public-page" id="main-content">
        {children}
      </main>
      <Footer />
    </>
  )
}

export function PublicHero({
  eyebrow,
  title,
  highlight,
  description,
  action,
}: {
  eyebrow: string
  title: string
  highlight: string
  description: string
  action: { label: string; href: string }
}) {
  const actionLink =
    action.href.startsWith('#') ? (
      <a className="button button--gold" href={action.href}>
        {action.label} <ArrowIcon />
      </a>
    ) : (
      <Link className="button button--gold" to={action.href}>
        {action.label} <ArrowIcon />
      </Link>
    )

  return (
    <section className="public-hero">
      <div aria-hidden="true" className="public-hero__orb" />
      <div className="content-width public-hero__content">
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1>
          {title}
          <br />
          <em>{highlight}</em>
        </h1>
        <p>{description}</p>
        {actionLink}
      </div>
    </section>
  )
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="content-width">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Wordmark light />
            <p>Train here. Work anywhere.</p>
          </div>
          <div className="site-footer__column">
            <h2>Explore</h2>
            <Link to="/">Home</Link>
            <Link to="/about">About Bridgeline</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="site-footer__column">
            <h2>Get started</h2>
            <Link to="/candidates">For candidates</Link>
            <Link to="/employers">For employers</Link>
            <Link to="/login">Sign in</Link>
          </div>
          <div className="site-footer__column">
            <h2>Contact</h2>
            <span>[PLACEHOLDER: confirmed company email]</span>
            <span>[PLACEHOLDER: confirmed company contact details]</span>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>© {currentYear} Bridgeline. All rights reserved.</p>
          <p>Train here. Work anywhere.</p>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
