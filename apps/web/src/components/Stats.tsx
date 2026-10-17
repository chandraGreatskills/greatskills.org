import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import Reveal from './Reveal'
import { stats } from '../data/site'
import { useCountUp } from '../lib/hooks'

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, value: current } = useCountUp(value)
  return (
    <div className="px-2 text-center">
      <div className="font-serif text-4xl font-bold text-white sm:text-[3.25rem]">
        <span ref={ref}>{current}</span>
        <span className="text-green-light">{suffix}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-white/70 sm:text-[15px]">{label}</p>
    </div>
  )
}

export default function Stats() {
  return (
    <section className="relative overflow-hidden bg-[#2b2a86] py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,#4b3fb0,transparent_45%),radial-gradient(circle_at_85%_60%,#6fab2f,transparent_40%)]" />

      <div className="container-x relative">
        {/* heading + copy */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-white sm:text-[2.5rem]">
              <span className="text-green-light">Embrace it :</span> The Future
              truly Belongs to You
            </h2>
            <Link
              to="/what-we-do"
              className="btn-green group mt-7 !text-xs !uppercase !tracking-wider"
            >
              Learn More
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-4 text-white/75 lg:text-[17px] lg:leading-[1.65]">
              <p>
                At GreatSkills, we are more than just a learning platform. We are a
                community of learners, leaders, and innovators who believe that
                education is the gateway to endless possibilities.
              </p>
              <p>
                Whether you're a student, a professional, or an organization, we
                help you harness your potential and achieve your greatest
                ambitions.
              </p>
            </div>
          </Reveal>
        </div>

        {/* group photo */}
        <Reveal delay={0.15}>
          <div className="mt-10 overflow-hidden rounded-3xl shadow-2xl">
            <img
              src="/assets/Embrace-it-The-Future-truly-Belongs-to-You_min_min-1024x331.webp"
              alt="Great Skills community of learners"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        {/* stats */}
        <div className="mt-12 grid grid-cols-2 gap-y-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className={i > 0 ? 'lg:border-l lg:border-white/15' : ''}>
                <Stat {...s} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
