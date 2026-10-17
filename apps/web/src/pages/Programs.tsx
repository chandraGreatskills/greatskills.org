import { FiArrowRight, FiUsers, FiZap } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import EmailCapture from '../components/EmailCapture'

export type Program = {
  slug: string
  tag: string
  title: string
  text: string
  /** Artwork used on the live card. Cards without one fall back to `icon`. */
  img?: string
  icon?: IconType
  to?: string
}

export const programs: Program[] = [
  {
    slug: 'data-ai-scientist',
    tag: 'Flagship',
    title: 'Data AI Scientist',
    text: 'Become a Data and AI Scientist for life in your field of interest, with hands-on projects, real-world data, and mentorship from industry experts, one hour a day.',
    img: '/assets/image.png',
    to: '/data-ai-scientist',
  },
  {
    slug: 'empower-your-culture',
    tag: 'Organizations',
    title: 'Empower Your Culture',
    text: 'Build a learning-first culture across your organization. Upskill teams, close skill gaps, and turn your workforce into a durable competitive advantage.',
    icon: FiUsers,
  },
  {
    slug: 'start-your-own-business',
    tag: 'Entrepreneurs',
    title: 'Start Your Own Business',
    text: 'From idea to launch. Practical guidance, tooling, and mentorship to help you turn a bold concept into a working venture.',
    icon: FiZap,
  },
  {
    slug: 'grow-your-business',
    tag: 'Growth',
    title: 'Grow Your Business',
    text: 'Scale what’s working. Talent strategy, operational optimization, and technology to drive sustainable, innovative growth.',
    img: '/assets/Grow-Your-Business.svg',
  },
]

/** Shared by /programs and /data-ai-scientist. The first card gets the dark
 *  treatment; `columns` keeps the last row full so nothing sits orphaned. */
export function ProgramGrid({
  items,
  columns = 2,
}: {
  items: Program[]
  columns?: 2 | 3
}) {
  return (
    <div className={`grid gap-6 ${columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      {items.map((p, i) => {
        const feature = i === 0
        return (
          <Reveal key={p.slug} delay={i * 0.06} className="h-full">
            <div
              className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-navy/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card ${
                feature ? 'bg-navy-green text-white' : 'bg-navy-50'
              }`}
            >
              {p.img && (
                <div
                  className={
                    feature
                      ? 'overflow-hidden'
                      : 'grid place-items-center overflow-hidden bg-white/60 p-6'
                  }
                >
                  <img
                    src={p.img}
                    alt={p.title}
                    className={
                      feature
                        ? 'h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105'
                        : 'h-28 w-auto object-contain'
                    }
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col p-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  {p.icon && (
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                      <p.icon className="h-7 w-7" />
                    </div>
                  )}
                  <span
                    className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                      feature ? 'bg-white/10 text-green-light' : 'bg-green/10 text-green-deep'
                    }`}
                  >
                    {p.tag}
                  </span>
                </div>
                <h3 className={`h-serif text-2xl ${feature ? '!text-white' : ''}`}>
                  {p.title}
                </h3>
                <p
                  className={`mt-3 flex-1 leading-relaxed ${
                    feature ? 'text-white/70' : 'text-ink'
                  }`}
                >
                  {p.text}
                </p>
                <a
                  href={p.to ?? '#email'}
                  className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
                    feature ? 'text-green-light' : 'text-green-deep'
                  }`}
                >
                  Learn more
                  <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}

export default function Programs() {
  return (
    <>
      <PageHero
        eyebrow="Programs"
        title="The future belongs to those who are"
        highlight="prepared today"
        subtitle="At Great Skills we believe that the future belongs to those who are prepared today. We are committed to providing that preparation."
        visual={
          <img
            src="/assets/Programs.png"
            alt="Great Skills programs"
            className="w-full rounded-3xl shadow-card"
          />
        }
      />

      {/* Strategy band */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Reveal>
            <img
              src="/assets/Happy-People-1_min.webp"
              alt="Learners collaborating at Great Skills"
              className="w-full rounded-3xl shadow-card"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <img src="/assets/Life.svg" alt="Learn, Experience, Live" className="h-16 w-auto" />
            <figure className="mt-7">
              <blockquote className="text-lg leading-relaxed text-ink">
                Success doesn’t happen by chance, but by strategy. Every challenge is a
                puzzle that demands a well-thought-out approach, carefully planned, and
                executed with precision. Solutions built this way are the ones that stand
                the test of time.
              </blockquote>
              <figcaption className="mt-7">
                <img
                  src="/assets/chandra.svg"
                  alt=""
                  aria-hidden
                  className="h-40 w-auto rounded-2xl"
                />
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x">
          <ProgramGrid items={programs} />
        </div>
      </section>

      <EmailCapture />
    </>
  )
}
