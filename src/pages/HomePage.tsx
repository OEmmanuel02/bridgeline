import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Footer, Header, ArrowIcon, Eyebrow, SectionHeading } from '../components/SiteChrome'

const roles = [
  {
    number: '01',
    title: 'Customer support',
    description: 'Help customers get clear, thoughtful answers and a dependable experience.',
  },
  {
    number: '02',
    title: 'Virtual assistance',
    description: 'Support busy teams with the coordination and follow-through that keeps work moving.',
  },
  {
    number: '03',
    title: 'Operations support',
    description: 'Bring care and consistency to the everyday processes behind a growing business.',
  },
]

const questions = [
  {
    question: 'Is it free to apply?',
    answer:
      'Yes. Candidates never pay an application fee. Bridgeline’s business model is based on employer-paid placement fees.',
  },
  {
    question: 'Who is the program for?',
    answer:
      'Bridgeline is being built for ambitious Nigerians interested in developing the skills needed for remote work. Specific eligibility requirements will be shared when applications open.',
  },
  {
    question: 'What roles does Bridgeline focus on?',
    answer:
      'The initial focus areas are customer support, virtual assistance, and operations support. A role focus does not mean there is an active vacancy.',
  },
  {
    question: 'How does training work?',
    answer:
      'Candidates who progress will receive structured training and assessment. The curriculum and schedule have not yet been established; confirmed details should be available before applications open.',
  },
  {
    question: 'Does completing training guarantee a job?',
    answer:
      'No. Training does not guarantee placement. Opportunities depend on assessment results, employer requirements, and available positions.',
  },
  {
    question: 'How are candidates matched with employers?',
    answer:
      'Candidates are considered for employer matching after training and assessment. Employers only see candidate information when Bridgeline authorizes access.',
  },
]
export function HomePage() {
  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14 },
    )
    revealElements.forEach((element) => {
      observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <section className="hero">
          <div aria-hidden="true" className="hero__grid" />
          <div aria-hidden="true" className="hero-art">
            <div className="hero-art__halo hero-art__halo--outer" />
            <div className="hero-art__halo hero-art__halo--inner" />
            <div className="hero-art__sun" />
            <div className="hero-art__bridge">
              <span className="hero-art__bridge-top" />
              <span className="hero-art__bridge-deck" />
              <span className="hero-art__pillar hero-art__pillar--left" />
              <span className="hero-art__pillar hero-art__pillar--right" />
              <span className="hero-art__reflection" />
            </div>
            <span className="hero-art__coordinate hero-art__coordinate--left">
              06° 31&apos; N
            </span>
            <span className="hero-art__coordinate hero-art__coordinate--right">
              03° 22&apos; E
            </span>
          </div>
          <div className="hero__content content-width">
            <Eyebrow light>Built for what comes next</Eyebrow>
            <h1>
              Local talent.
              <br />
              <span>Global opportunity.</span>
            </h1>
            <p className="hero__description">
              We train ambitious Nigerians for remote work and connect qualified talent with
              companies around the world.
            </p>
            <div className="hero__actions">
              <Link className="button button--gold" to="/candidates">
                Start your journey <ArrowIcon diagonal />
              </Link>
              <a className="text-link text-link--light" href="#employers">
                I&apos;m hiring <ArrowIcon />
              </a>
            </div>
            <p className="hero__note">No application fee. No promise of guaranteed employment.</p>
          </div>
          <a className="hero__scroll" href="#approach">
            <span className="hero__scroll-line" />
            <span>Scroll to discover</span>
          </a>
          <span aria-hidden="true" className="hero__index">
            01 — 05
          </span>
        </section>

        <section aria-label="Our approach" className="principles-strip" id="approach">
          <div className="content-width principles-strip__inner">
            <p>Opportunity should be earned, not bought.</p>
            <div className="principles-strip__items">
              <span>Training</span>
              <span aria-hidden="true">/</span>
              <span>Assessment</span>
              <span aria-hidden="true">/</span>
              <span>Matching</span>
            </div>
          </div>
        </section>

        <section className="story-section section-pad">
          <div className="content-width story-section__grid">
            <div className="story-section__visual reveal" data-reveal>
              <div aria-hidden="true" className="story-art">
                <div className="story-art__line story-art__line--one" />
                <div className="story-art__line story-art__line--two" />
                <div className="story-art__line story-art__line--three" />
                <span className="story-art__label">A bridge to possibility</span>
                <span className="story-art__number">01 / 03</span>
                <div className="story-art__mark">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <div className="story-section__copy reveal" data-reveal>
              <SectionHeading eyebrow="The opportunity" title="Potential is everywhere. Access isn’t.">
                Talented people are ready to contribute. Businesses need dependable support. The
                right preparation can bring the two closer together.
              </SectionHeading>
              <div className="story-section__statement">
                <span className="statement-mark">“</span>
                <p>
                  Bridgeline creates a clearer path from <em>ambition</em> to <em>opportunity.</em>
                </p>
              </div>
              <Link className="text-link" to="/about">
                Get to know Bridgeline <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        <section className="process-section section-pad">
          <div className="content-width">
            <div className="process-section__intro reveal" data-reveal>
              <SectionHeading eyebrow="A thoughtful process" title="Prepared with purpose.">
                A considered journey helps candidates build relevant skills and helps employers
                make more informed decisions.
              </SectionHeading>
              <span className="process-section__aside">A path forward, together</span>
            </div>
            <div className="journeys">
              <article className="journey-card journey-card--candidate reveal" data-reveal>
                <div className="journey-card__topline">
                  <span>01</span>
                  <span>For candidates</span>
                </div>
                <h3>Your next chapter starts here.</h3>
                <ol className="step-list">
                  <li>
                    <span>01</span>
                    <div>
                      <h4>Apply</h4>
                      <p>Tell us where you want to go and what you bring.</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h4>Learn &amp; demonstrate</h4>
                      <p>Build relevant skills and show what you can do.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h4>Become match-ready</h4>
                      <p>Qualifying candidates may be considered for employer matching.</p>
                    </div>
                  </li>
                </ol>
                <Link className="text-link" to="/candidates">
                  Explore the candidate journey <ArrowIcon />
                </Link>
              </article>
              <article className="journey-card journey-card--employer reveal" data-reveal>
                <div className="journey-card__topline">
                  <span>02</span>
                  <span>For employers</span>
                </div>
                <h3>Find people ready to contribute.</h3>
                <ol className="step-list">
                  <li>
                    <span>01</span>
                    <div>
                      <h4>Share your needs</h4>
                      <p>Tell us about the role and the support your team needs.</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h4>We identify &amp; assess</h4>
                      <p>We look for relevant skills and role alignment.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h4>Meet eligible talent</h4>
                      <p>Review suitable candidates when matching is authorized.</p>
                    </div>
                  </li>
                </ol>
                <Link className="text-link" to="/employers">
                  Explore hiring with Bridgeline <ArrowIcon />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="roles-section section-pad">
          <div className="content-width">
            <div className="roles-section__heading reveal" data-reveal>
              <SectionHeading eyebrow="Where we begin" title="Skills for work that matters.">
                Our initial focus is on practical roles that help remote teams do their best work.
              </SectionHeading>
              <span className="roles-section__note">Initial areas of focus</span>
            </div>
            <div className="role-list">
              {roles.map((role) => (
                <article className="role-item reveal" data-reveal key={role.number}>
                  <span className="role-item__number">{role.number}</span>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                  <span aria-hidden="true" className="role-item__ornament">
                    <span />
                    <span />
                    <span />
                  </span>
                </article>
              ))}
            </div>
            <p className="roles-section__disclaimer">
              Focus areas are not a guarantee of current vacancies or future placement.
            </p>
          </div>
        </section>

        <section className="employer-section section-pad" id="employers">
          <div className="content-width employer-section__grid">
            <div className="employer-section__copy reveal" data-reveal>
              <Eyebrow light>For the teams building what’s next</Eyebrow>
              <h2>Good work deserves good people.</h2>
              <p>
                Bridgeline helps employers connect with Nigerian talent prepared for remote
                customer support, virtual assistance, and operations roles.
              </p>
              <ul className="check-list">
                <li>Role-relevant training and assessment</li>
                <li>Candidate visibility managed with care</li>
                <li>A considered path from request to introduction</li>
              </ul>
              <Link className="button button--outline-light" to="/employers">
                Hire through Bridgeline <ArrowIcon diagonal />
              </Link>
            </div>
            <div aria-hidden="true" className="employer-visual reveal" data-reveal>
              <span className="employer-visual__caption">Different places. Shared ambition.</span>
              <div className="employer-visual__orbit employer-visual__orbit--one" />
              <div className="employer-visual__orbit employer-visual__orbit--two" />
              <div className="employer-visual__orbit employer-visual__orbit--three" />
              <span className="employer-visual__point employer-visual__point--one" />
              <span className="employer-visual__point employer-visual__point--two" />
              <span className="employer-visual__point employer-visual__point--three" />
              <div className="employer-visual__center">B</div>
              <span className="employer-visual__label employer-visual__label--one">Lagos</span>
              <span className="employer-visual__label employer-visual__label--two">Your team</span>
            </div>
          </div>
        </section>

        <section className="candidate-section section-pad" id="candidates">
          <div className="content-width candidate-section__grid">
            <div className="candidate-section__heading reveal" data-reveal>
              <SectionHeading eyebrow="For candidates" title="Your ambition has a place here.">
                Build practical skills for a changing world of work—and take your next step with
                intention.
              </SectionHeading>
              <Link className="button button--dark" to="/candidates">
                Apply for free <ArrowIcon diagonal />
              </Link>
            </div>
            <div className="candidate-points reveal" data-reveal>
              <div className="candidate-point">
                <span>01</span>
                <div>
                  <h3>Start without a fee</h3>
                  <p>Applying is free. You should never have to pay just to be considered.</p>
                </div>
              </div>
              <div className="candidate-point">
                <span>02</span>
                <div>
                  <h3>Learn with direction</h3>
                  <p>Training and assessment help make your skills visible and role-relevant.</p>
                </div>
              </div>
              <div className="candidate-point">
                <span>03</span>
                <div>
                  <h3>Keep expectations real</h3>
                  <p>
                    Completing training does not guarantee a job. Matching depends on readiness
                    and available roles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="faq-section section-pad">
          <div className="content-width faq-section__grid">
            <div className="faq-section__intro reveal" data-reveal>
              <SectionHeading eyebrow="Good to know" title="A few things, clearly.">
                Straight answers about how Bridgeline works.
              </SectionHeading>
              <Link className="text-link" to="/contact">
                Still have a question? <ArrowIcon />
              </Link>
            </div>
            <div className="faq-list reveal" data-reveal>
              {questions.map((item, index) => (
                <details className="faq-item" key={item.question}>
                  <summary>
                    <span className="faq-item__number">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.question}</span>
                    <span aria-hidden="true" className="faq-item__toggle" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-section">
          <div aria-hidden="true" className="closing-section__glow" />
          <div className="content-width closing-section__inner reveal" data-reveal>
            <Eyebrow light>The next step is yours</Eyebrow>
            <h2>
              Let’s build a
              <br />
              <em>stronger connection.</em>
            </h2>
            <p>Whether you’re ready to grow your skills or your team, start a conversation.</p>
            <div className="closing-section__actions">
              <Link className="button button--gold" to="/candidates">
                Apply as a candidate <ArrowIcon diagonal />
              </Link>
              <Link className="button button--outline-light" to="/employers">
                Hire through Bridgeline <ArrowIcon diagonal />
              </Link>
            </div>
          </div>
          <span aria-hidden="true" className="closing-section__index">B / 01</span>
        </section>
      </main>
      <Footer />
    </>
  )
}
