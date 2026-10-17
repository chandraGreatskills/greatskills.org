import { Link } from 'react-router-dom'
import { FiArrowRight, FiCompass, FiTarget } from 'react-icons/fi'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import LogoMarquee from '../components/LogoMarquee'
import { aboutStats, exploreMore, leaders, philosophy } from '../data/site'

export default function AboutUs() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Challenge Yourself,"
        highlight="Shape Your Future."
        subtitle="At GreatSkills, we focus on cutting-edge technologies like AI, data science, and essential life skills to empower individuals to become innovative, responsible, and successful global leaders."
        stats={aboutStats}
        visual={
          <img
            src="/assets/Frame-1000019101.svg"
            alt="Great Skills learners and mentors"
            className="w-full"
          />
        }
      />

      {/* Who we are */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <img
              src="/assets/Who-we-are_min.webp"
              alt="The Great Skills team"
              className="w-full rounded-3xl shadow-card"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="h-serif text-3xl sm:text-4xl">Who we are</h2>
            <p className="mt-4 leading-relaxed text-ink">
              At Greatskills we believe that the future belongs to those who are prepared
              today. We are committed to providing comprehensive, real-time personal and
              professional development training. By focusing on cutting-edge technologies
              such as AI, data science and social skills, we empower individuals to become
              responsible, ethical and successful global citizens.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                  <FiCompass className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="h-serif text-xl">Our Vision</h3>
                  <p className="mt-1.5 leading-relaxed text-ink">
                    To empower individuals globally with the skills, tools, and values to
                    succeed in a dynamic world.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-shine text-white shadow-glow">
                  <FiTarget className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="h-serif text-xl">Our Mission</h3>
                  <p className="mt-1.5 leading-relaxed text-ink">
                    Provide personalized, technology-driven learning to inspire, mentor
                    and connect responsible global talent with exciting opportunities.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <img
              src="/assets/About-Us-missions_min.webp"
              alt="Our philosophy in practice"
              className="w-full rounded-3xl shadow-card"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="h-serif text-3xl sm:text-4xl">Our Philosophy</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {philosophy.map((p) => (
                <div
                  key={p.title}
                  className="rounded-3xl border border-navy/5 bg-white p-6 shadow-soft"
                >
                  <h3 className="h-serif text-lg leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{p.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Leaders */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="h-serif text-3xl sm:text-4xl">Meet Our Leaders</h2>
            <p className="mt-4 leading-relaxed text-ink">
              At Great Skills, our global leaders and industry experts equip learners with
              essential skills and knowledge, empowering success in today’s fast-paced
              world.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leaders.map((l, i) => (
              <Reveal key={l.name} delay={(i % 4) * 0.06}>
                <div className="group h-full rounded-3xl border border-navy/5 bg-navy-50 p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-card">
                  <img
                    src={l.photo}
                    alt={l.name}
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                  <h3 className="h-serif mt-5 text-lg leading-snug">{l.name}</h3>
                  <p className="mt-1.5 text-sm text-ink">{l.focus}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Explore with us more */}
      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="max-w-3xl">
            <h2 className="h-serif text-3xl sm:text-4xl">Explore with us more</h2>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {exploreMore.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <div className="flex h-full flex-col rounded-3xl border border-navy/5 bg-white p-8 shadow-soft">
                  <h3 className="h-serif text-2xl">{c.title}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-ink">{c.text}</p>
                  <Link to={c.to} className="btn-navy mt-6 self-start">
                    {c.cta} <FiArrowRight />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <LogoMarquee />
    </>
  )
}
