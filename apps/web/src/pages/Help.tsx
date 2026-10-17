import { Link } from 'react-router-dom'
import { FiArrowRight, FiHelpCircle, FiMail, FiPhone } from 'react-icons/fi'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import { footer } from '../data/site'

/* Deliberately minimal: FAQs and an inbox are the only support channels that
   exist today. Add more here as they come online. */
const routes = [
  {
    icon: FiHelpCircle,
    title: 'Read the FAQs',
    text: 'Answers to the questions we hear most about programs, the Talent Hub, assessments and timelines.',
    cta: 'Open FAQs',
    to: '/resources',
  },
  {
    icon: FiMail,
    title: 'Email us',
    text: 'Tell us what you need and someone will come back to you. Best for enrolment, partnership and billing questions.',
    cta: 'Contact us',
    to: '/connect',
  },
]

export default function Help() {
  return (
    <>
      <PageHero
        eyebrow="Help"
        title="Need a hand?"
        highlight="Start here."
        subtitle="Whether you are picking a program, tracking an application, or working with us as a partner, these are the fastest ways to reach the right person."
      />

      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {routes.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.08}>
                <div className="flex h-full flex-col rounded-3xl border border-navy/5 bg-navy-50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-card">
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                    <r.icon className="h-7 w-7" />
                  </div>
                  <h2 className="h-serif text-xl">{r.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{r.text}</p>
                  <Link to={r.to} className="btn-navy mt-6 self-start">
                    {r.cta} <FiArrowRight />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x max-w-3xl text-center">
          <Reveal>
            <h2 className="h-serif text-3xl">Prefer to talk?</h2>
            <p className="mt-3 text-ink">
              Our team answers during business hours in India, Canada and the US.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {footer.phones.map((p) => (
                <a
                  key={p}
                  href={`tel:${p.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:border-green hover:text-green-deep"
                >
                  <FiPhone className="h-4 w-4 text-green" /> {p}
                </a>
              ))}
              <a href={`mailto:${footer.email}`} className="btn-green">
                <FiMail className="h-4 w-4" /> {footer.email}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
