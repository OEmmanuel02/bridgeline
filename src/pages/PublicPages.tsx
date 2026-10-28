import { CandidateApplicationForm, ContactMessageForm, HiringRequestForm } from './PublicForms'
import { Eyebrow, PublicHero, PublicPageFrame, SectionHeading } from '../components/SiteChrome'

export function CandidatesPage() {
  return (
    <PublicPageFrame>
      <PublicHero
        action={{ label: 'Start a free application', href: '#application' }}
        description="Build practical skills for remote work through a considered path of training and assessment. Applying is free; employment is not guaranteed."
        eyebrow="For candidates"
        highlight="Start with preparation."
        title="Your next chapter can reach further."
      />
      <section className="public-section">
        <div className="content-width public-two-column">
          <div>
            <SectionHeading eyebrow="A path with purpose" title="Make your skills count.">
              Bridgeline is being built for Nigerians who want to develop skills for remote work
              and explore opportunities with international companies.
            </SectionHeading>
          </div>
          <div className="public-detail-list">
            <article>
              <span>01</span>
              <div>
                <h3>Apply without a fee</h3>
                <p>No application fee is charged to candidates.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Train and demonstrate</h3>
                <p>
                  Candidates who progress will take part in structured training and assessment.
                  Program details are still being finalized.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Be considered for matching</h3>
                <p>
                  Assessment results and employer requirements help determine matching
                  consideration. Training does not guarantee placement.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="public-band">
        <div className="content-width public-band__inner">
          <Eyebrow>Initial areas of focus</Eyebrow>
          <h2>Customer support. Virtual assistance. Operations support.</h2>
          <p>These are focus areas, not a list of active vacancies.</p>
        </div>
      </section>
      <section className="public-section public-section--form" id="application">
        <div className="content-width public-form-layout">
          <div className="public-form-intro">
            <SectionHeading eyebrow="Candidate application" title="Tell us about yourself.">
              Share the information needed to understand your interests and current skills.
            </SectionHeading>
            <p className="public-form-intro__callout">
              <strong>It is free to apply.</strong> Submitting an application does not guarantee
              training or employment.
            </p>
          </div>
          <CandidateApplicationForm />
        </div>
      </section>
    </PublicPageFrame>
  )
}

export function EmployersPage() {
  return (
    <PublicPageFrame>
      <PublicHero
        action={{ label: 'Share your hiring needs', href: '#hiring-request' }}
        description="Bridgeline is building a considered path for employers to meet Nigerian talent prepared for remote customer support, virtual assistance, and operations roles."
        eyebrow="For employers"
        highlight="People prepared to contribute."
        title="Build your team with"
      />
      <section className="public-section">
        <div className="content-width">
          <div className="public-section__heading">
            <SectionHeading eyebrow="A considered process" title="From role brief to introduction.">
              Share the need. We work to understand the role and consider suitable candidates
              based on relevant skills and assessment.
            </SectionHeading>
          </div>
          <div className="employer-steps">
            <article>
              <span>01 / Tell us what you need</span>
              <h3>Share the role and the context.</h3>
              <p>Include the responsibilities, time zone, and compensation range for the role.</p>
            </article>
            <article>
              <span>02 / Review and assess</span>
              <h3>Role fit matters.</h3>
              <p>
                Bridgeline’s screening approach is intended to consider role-relevant skills and
                assessment results. Specific criteria depend on the role and are being finalized.
              </p>
            </article>
            <article>
              <span>03 / Meet eligible candidates</span>
              <h3>Access is managed carefully.</h3>
              <p>
                Candidate details are shared only when Bridgeline authorizes visibility and
                applicable privacy permissions are in place.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="public-band public-band--employer">
        <div className="content-width public-band__inner">
          <Eyebrow light>Initial focus roles</Eyebrow>
          <h2>Customer support. Virtual assistance. Operations support.</h2>
          <p>Focus roles do not indicate that a vacancy is currently available.</p>
        </div>
      </section>
      <section className="public-section public-section--form" id="hiring-request">
        <div className="content-width public-form-layout">
          <div className="public-form-intro">
            <SectionHeading eyebrow="Hiring request" title="Tell us about the role.">
              Share your requirements so Bridgeline can understand the support your team needs.
            </SectionHeading>
            <p className="public-form-intro__callout">
              Bridgeline’s model uses employer-paid placement fees. Pricing and process details
              have not been established here; a request is not a hiring commitment.
            </p>
          </div>
          <HiringRequestForm />
        </div>
      </section>
    </PublicPageFrame>
  )
}

export function AboutPage() {
  return (
    <PublicPageFrame>
      <PublicHero
        action={{ label: 'Explore the candidate journey', href: '/candidates' }}
        description="Bridgeline is being built to connect the potential of Nigerian talent with the needs of remote teams—through preparation, assessment, and responsible matching."
        eyebrow="About Bridgeline"
        highlight="Train here. Work anywhere."
        title="A more considered path to"
      />
      <section className="public-section">
        <div className="content-width about-story">
          <SectionHeading eyebrow="Why Bridgeline exists" title="Potential deserves a path.">
            We believe that access to opportunity can grow when people have a chance to build
            relevant skills and demonstrate what they can do.
          </SectionHeading>
          <div className="about-story__body">
            <p>
              Bridgeline aims to help young Nigerians prepare for remote work in customer support,
              virtual assistance, and operations support, then connect qualified candidates with
              employers looking for dependable remote staff.
            </p>
            <p>
              Training and assessment are part of that path—not a promise of employment. Matching
              depends on a candidate’s assessment results, employer requirements, and available
              positions.
            </p>
          </div>
        </div>
      </section>
      <section className="public-band">
        <div className="content-width public-band__inner">
          <Eyebrow>Our approach</Eyebrow>
          <h2>Prepare with purpose. Assess with care. Connect responsibly.</h2>
          <p>
            Candidate information is not automatically public. Employers pay placement fees;
            candidates never pay to apply.
          </p>
        </div>
      </section>
      <section className="public-section about-vision">
        <div className="content-width public-two-column">
          <SectionHeading eyebrow="The long view" title="A connection that works both ways.">
            We want to make it easier for ambitious people to prepare for remote work and for
            employers to find candidates whose skills fit their needs.
          </SectionHeading>
          <div className="about-vision__note">
            <span className="about-vision__mark" aria-hidden="true">B</span>
            <p>
              Bridgeline’s programs and employer network are being developed. No company history,
              partnerships, placement results, or hiring outcomes are claimed here.
            </p>
          </div>
        </div>
      </section>
    </PublicPageFrame>
  )
}

export function ContactPage() {
  return (
    <PublicPageFrame>
      <PublicHero
        action={{ label: 'Write a message', href: '#contact-form' }}
        description="Have a question about the candidate journey or hiring through Bridgeline? Use the form to prepare a message."
        eyebrow="Contact"
        highlight="Let’s start a conversation."
        title="A good connection begins with"
      />
      <section className="public-section public-section--form" id="contact-form">
        <div className="content-width public-form-layout">
          <div className="public-form-intro">
            <SectionHeading eyebrow="Get in touch" title="What would you like to know?">
              Send a note for the Bridgeline team. Online submission availability is shown before
              you send.
            </SectionHeading>
            <div className="contact-placeholder">
              <h3>Contact details</h3>
              <p>[PLACEHOLDER: confirmed company email]</p>
              <p>[PLACEHOLDER: confirmed company contact details]</p>
              <p>No office address or phone number has been supplied.</p>
            </div>
          </div>
          <ContactMessageForm />
        </div>
      </section>
    </PublicPageFrame>
  )
}
