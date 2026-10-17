import { FiBookOpen, FiTrendingUp, FiAward } from 'react-icons/fi'
import Reveal from './Reveal'
import { valueProps } from '../data/site'

const icons = [FiBookOpen, FiTrendingUp, FiAward]

export default function ValueCards() {
  return (
    <section id="about" className="bg-white py-20 lg:py-24">
      <div className="container-x">
        <Reveal className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-ink">
            Great Skills bridges education, real-world learning, skills, and
            opportunity. No matter where you are in your journey, you can open
            new doors and make an impact.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {valueProps.map((v, i) => {
            const Icon = icons[i]
            return (
              <Reveal key={v.title} delay={i * 0.1}>
                <div className="group h-full rounded-3xl border border-navy/5 bg-navy-50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-green/30 hover:bg-white hover:shadow-card">
                  <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-green-shine text-white shadow-glow transition-transform group-hover:scale-110">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="h-serif mb-3 text-xl">{v.title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink">{v.text}</p>
                  <a
                    href="#offerings"
                    className="mt-5 inline-flex text-sm font-semibold text-green-deep opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Learn More →
                  </a>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
