import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import EmailCapture from '../components/EmailCapture'

export type Pillar = {
  slug: string
  title: string
  intro: string
  /** Live section artwork. Talent Hub runs without one. */
  img?: string
  items: { title: string; text: string }[]
}

export const pillars: Pillar[] = [
  {
    slug: 'learning',
    title: 'Learning',
    img: '/assets/Learning_min.webp',
    intro:
      'Our personalized and interactive learning experiences are designed for all stages of life and career. From students to professionals seeking to upskill, we offer essential tools and guidance for success.',
    items: [
      {
        title: 'Data Mastery',
        text: 'Data Mastery equips learners with advanced skills in AI, machine learning, analytics, cybersecurity, and more.',
      },
      {
        title: 'Study Links',
        text: 'Study Links offers tailored, real-time tutoring for students worldwide, both in-person and online.',
      },
    ],
  },
  {
    slug: 'skills',
    title: 'Skills',
    img: '/assets/skills_min.webp',
    intro:
      'We empower individuals with both professional and life skills, the true pillars of success, essential for thriving in careers and everyday life.',
    items: [
      {
        title: 'Pro Skills',
        text: 'Our Pro Skills program hones key competencies like leadership, management, analysis, and communication, equipping you to excel and stand out in any professional setting.',
      },
      {
        title: 'Life Skills',
        text: 'Life Skills focuses on emotional intelligence, time management, and problem-solving, building the resilience and empathy needed for personal fulfillment and everyday success.',
      },
    ],
  },
  {
    slug: 'talent-hub',
    title: 'Talent Hub',
    intro:
      'Our Talent Hub connects skilled individuals with businesses, free of charge. Whether you’re a company seeking top professionals or a learner searching for opportunities, we bridge the gap, fostering connections and mutual growth. Great Skillians also support each other through references and guidance.',
    items: [
      {
        title: 'Job Placement',
        text: 'We provide comprehensive job placement services, from securing positions to offering ongoing support for career success. Our global network connects learners with opportunities locally and internationally.',
      },
      {
        title: 'Talent Development',
        text: 'Through strategic partnerships and advanced training, we help organizations develop industry-ready talent. We identify skill gaps, curate talent pools, and offer customized training to drive continuous growth and innovation.',
      },
    ],
  },
  {
    slug: 'consulting',
    title: 'Consulting',
    img: '/assets/consulting_min.webp',
    intro:
      'GreatSkills offers strategic consulting, application development, and custom digital transformation services. We work with businesses to develop talent strategies, optimize operations, and drive innovation.',
    items: [
      {
        title: 'Tailored Solutions',
        text: 'We offer technology and industry agnostic customized digital transformation, employee development, and application solutions to fit your business needs.',
      },
      {
        title: 'Driving Growth',
        text: 'Our services empower businesses to harness their workforce’s full potential, implement cutting-edge technologies, and build sustainable growth.',
      },
      {
        title: 'Innovative Strategies',
        text: 'We craft forward-thinking strategies to streamline operations, optimize processes, and drive innovation, ensuring your business stays ahead of the curve in an evolving digital landscape.',
      },
    ],
  },
]

export const highlights = [
  'Create Customized Learning Paths',
  'Showcase Real-world Impact',
  'Run Hands-on Workshops',
]

/** Alternating image/copy bands. */
export function PillarSections({ items }: { items: Pillar[] }) {
  return (
    <>
      {items.map((p, i) => (
        <section
          key={p.slug}
          className={i % 2 === 0 ? 'bg-white py-16 lg:py-20' : 'bg-navy-50 py-16 lg:py-20'}
        >
          <div
            className={`container-x grid items-center gap-12 lg:gap-16 ${
              p.img ? 'lg:grid-cols-2' : ''
            }`}
          >
            {p.img && (
              <Reveal className={i % 2 === 0 ? '' : 'lg:order-2'}>
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full rounded-3xl object-cover shadow-card"
                />
              </Reveal>
            )}

            <Reveal delay={0.1}>
              <h2 className="h-serif text-3xl sm:text-4xl">{p.title}</h2>
              <p className="mt-4 leading-relaxed text-ink">{p.intro}</p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {p.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-navy/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                  >
                    <h3 className="h-serif text-lg">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{item.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ))}
    </>
  )
}

export default function WhatWeDo() {
  return (
    <>
      <PageHero
        eyebrow="What we do"
        title="Transformative training that bridges"
        highlight="knowledge with impact"
        subtitle="GreatSkills provides transformative training experiences that bridge knowledge with real-world application. We empower learners, professionals, and businesses through personalized learning, hands-on skill development, and strategic consulting."
        visual={
          <img
            src="/assets/what-we-do_min.webp"
            alt="What Great Skills does"
            className="w-full rounded-3xl shadow-card"
          />
        }
      />

      <section className="bg-white pt-10">
        <div className="container-x flex flex-wrap justify-center gap-3">
          {highlights.map((h) => (
            <span
              key={h}
              className="rounded-full border border-navy/10 bg-navy-50 px-5 py-2 text-sm font-medium text-navy"
            >
              {h}
            </span>
          ))}
        </div>
      </section>

      <PillarSections items={pillars} />

      <EmailCapture />
    </>
  )
}
