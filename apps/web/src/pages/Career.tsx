import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiClock,
  FiHeart,
  FiMapPin,
  FiPieChart,
  FiSun,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import { careerJourneys, careerPerks, careerStats, jobOpenings } from '../data/site'

const perkIcons: IconType[] = [
  FiHeart,
  FiPieChart,
  FiSun,
  FiClock,
  FiBookOpen,
  FiAward,
]

export default function Career() {
  return (
    <>
      <PageHero
        eyebrow="Career"
        title="Work Where You Thrive"
        subtitle="Are you ready to make a lasting difference with us? Explore our careers and join us."
        stats={careerStats}
        cta={{ label: 'Search Open Roles', to: '/job-openings' }}
        visual={
          <img
            src="/assets/career-banner_min.webp"
            alt="Life at Great Skills"
            className="w-full"
          />
        }
      />

      {/* Perks */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="max-w-3xl">
            <h2 className="h-serif text-3xl sm:text-4xl">Perks of Joining Great Skills</h2>
            <p className="mt-4 leading-relaxed text-ink">
              At Great Skills, we believe that our people are our greatest asset. That’s
              why we offer a comprehensive benefits package designed to support you both
              personally and professionally. Here’s what you can look forward to as part
              of our team:
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {careerPerks.map((perk, i) => {
              const Icon = perkIcons[i % perkIcons.length]
              return (
                <Reveal key={perk} delay={i * 0.06}>
                  <div className="group flex h-full items-center gap-4 rounded-3xl border border-navy/5 bg-navy-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-card">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="h-serif text-lg leading-snug">{perk}</h3>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Career journeys */}
      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="max-w-3xl">
            <h2 className="h-serif text-3xl sm:text-4xl">
              Career Journeys: Empowering Your Future
            </h2>
            <p className="mt-4 leading-relaxed text-ink">
              At Great Skills, we prioritize creating an environment that fosters
              professional growth and personal fulfillment. Discover how joining our team
              has helped these individuals achieve success and make an impact.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {careerJourneys.map((j, i) => (
              <Reveal key={j.name} delay={i * 0.07}>
                <figure className="flex h-full flex-col rounded-3xl border border-navy/5 bg-white p-8 shadow-soft">
                  <blockquote className="flex-1 leading-relaxed text-ink">
                    “{j.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-4">
                    <img
                      src={j.photo}
                      alt={j.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    <span className="h-serif text-lg">{j.name}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section id="openings" className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="max-w-3xl">
            <h2 className="h-serif text-3xl sm:text-4xl">Find Your Perfect Fit with Us</h2>
          </Reveal>

          <div className="mt-10 divide-y divide-navy/10 overflow-hidden rounded-3xl border border-navy/10">
            {jobOpenings.map((job, i) => (
              <Reveal key={`${job.title}-${job.type}-${job.location}`} delay={i * 0.06}>
                <div className="flex flex-col gap-4 bg-white p-7 transition-colors hover:bg-navy-50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="h-serif text-xl">{job.title}</h3>
                    <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <FiClock className="h-4 w-4 text-green" />
                        {job.type}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiMapPin className="h-4 w-4 text-green" />
                        {job.location}
                      </span>
                    </p>
                  </div>
                  <Link to="/connect" className="btn-navy shrink-0 self-start sm:self-auto">
                    Apply Now <FiArrowRight />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
