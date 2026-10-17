import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiBriefcase,
  FiCalendar,
  FiArrowRight,
  FiSend,
  FiCheckCircle,
  FiZap,
  FiHelpCircle,
  FiUserPlus,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import LogoMarquee from '../components/LogoMarquee'

const promises = [
  'We’re here to help you realize your dreams, personal or professional.',
  'Our expertise supports students, employees, and organizations alike.',
  'Your vision fuels our passion to drive results.',
  'Together, we’ll turn your aspirations into reality.',
]

// One inbox per intent rather than sales@ for all three, as on the live page.
const teamCards: { icon: IconType; title: string; text: string; email: string }[] = [
  {
    icon: FiZap,
    title: 'Have a game-changing idea?',
    text: 'Drop us a line. Let’s explore how we can make it happen!',
    email: 'sales@greatskills.org',
  },
  {
    icon: FiHelpCircle,
    title: 'Got a question or need guidance?',
    text: 'Reach out to us. We’re always here to listen and collaborate.',
    email: 'contact@greatskills.org',
  },
  {
    icon: FiUserPlus,
    title: 'Build an amazing career!',
    text: 'We’re hiring! Send your resume to us. Let’s grow together.',
    email: 'careers@greatskills.org',
  },
]

export default function Connect() {
  return (
    <>
      <PageHero
        eyebrow="Connect"
        title="How can we"
        highlight="help you?"
        subtitle="We believe in the power of collaboration to achieve more. Reach out today and let’s make it happen."
        visual={
          <img
            src="/assets/How-can-we-help-.png"
            alt="Talk to the Great Skills team"
            className="w-full rounded-3xl shadow-card"
          />
        }
      />

      {/* Careers + Events */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x grid gap-6 md:grid-cols-2">
          <Reveal>
            <InfoCard
              icon={FiBriefcase}
              title="Careers"
              text="Great Skills offers exciting opportunities in application development, content curation, training, mentoring, consulting, and event management. Join us where your passion and our platform come together perfectly."
              cta="Explore Careers"
              to="/career"
              images={['/assets/careers.png']}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <InfoCard
              icon={FiCalendar}
              title="Events"
              text="Great Skills offers a range of engaging events, from strategy consulting and solution development to digital transformation workshops. We collaborate with businesses to optimize operations, innovate talent strategies, and stay ahead."
              cta="Explore Events"
              to="/resources"
              images={['/assets/event1.png', '/assets/event2.png']}
            />
          </Reveal>
        </div>
      </section>

      <LogoMarquee />

      {/* Contact form */}
      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <span className="eyebrow">Contact Us</span>
            <h2 className="h-serif text-3xl">Let’s turn your aspirations into reality</h2>
            <div className="mt-6 space-y-4">
              {promises.map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                  <p className="text-navy/80">{p}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      {/* Connect with our team */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <span className="eyebrow">Connect with our Team</span>
            <h2 className="h-serif text-3xl">We’d love to hear from you</h2>
            <p className="mt-3 text-ink">
              Whether you’re bringing a bold new concept to life, have a question about
              our services, or are ready to join our team, let’s work together to make
              your goals a success.
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {teamCards.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <div className="group h-full rounded-3xl border border-navy/5 bg-navy-50 p-7 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-card">
                  <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                    <c.icon className="h-7 w-7" />
                  </div>
                  <h3 className="h-serif mb-2 text-lg">{c.title}</h3>
                  <p className="text-sm text-ink">{c.text}</p>
                  <a
                    href={`mailto:${c.email}`}
                    className="mt-4 inline-block text-sm font-semibold text-green-deep"
                  >
                    {c.email}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function InfoCard({
  icon: Icon,
  title,
  text,
  cta,
  to,
  images,
}: {
  icon: IconType
  title: string
  text: string
  cta: string
  to: string
  images: string[]
}) {
  return (
    <div className="group flex h-full flex-col rounded-3xl border border-navy/5 bg-navy-50 p-8 transition-all duration-300 hover:shadow-card">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="h-serif text-2xl">{title}</h3>
      <p className="mt-3 leading-relaxed text-ink">{text}</p>

      {/* The live artwork has captions baked in, so it is never cropped. */}
      <div
        className={`mt-7 flex-1 items-start gap-4 ${
          images.length > 1 ? 'grid grid-cols-2' : 'grid'
        }`}
      >
        {images.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            className="w-full rounded-2xl object-contain"
          />
        ))}
      </div>

      <Link to={to} className="btn-navy mt-6 self-start">
        {cta} <FiArrowRight />
      </Link>
    </div>
  )
}

function ContactForm() {
  const [sent, setSent] = useState(false)
  const field = 'w-full rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-green focus:ring-2 focus:ring-green/20'

  if (sent) {
    return (
      <div className="grid h-full min-h-[320px] place-items-center rounded-3xl border border-navy/5 bg-white p-10 text-center shadow-soft">
        <div>
          <FiCheckCircle className="mx-auto h-14 w-14 text-green" />
          <h3 className="h-serif mt-4 text-2xl">Request received</h3>
          <p className="mt-2 text-ink">Thanks for reaching out. Our team will be in touch shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
      className="rounded-3xl border border-navy/5 bg-white p-8 shadow-soft"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input required placeholder="Name" className={field} />
        <input required type="email" placeholder="Email Address" className={field} />
        <input placeholder="Phone Number" className={field} />
        <input placeholder="Country" className={field} />
      </div>
      <textarea placeholder="Requirement" className={`${field} mt-4 min-h-[120px]`} />
      <p className="mt-3 text-xs text-navy/40">
        Note: We respect your privacy and will never share your details for marketing.
      </p>
      <button type="submit" className="btn-green mt-5 w-full">
        Send Your Request <FiSend className="h-4 w-4" />
      </button>
    </form>
  )
}
