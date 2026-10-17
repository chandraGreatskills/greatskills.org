import { FiCheck, FiArrowRight } from 'react-icons/fi'
import Reveal from './Reveal'
import { dataiFeatures } from '../data/site'

export default function DatAiScientist() {
  return (
    <section
      id="datai"
      className="relative overflow-hidden bg-navy-green py-20 text-white lg:py-24"
    >
      <div className="pointer-events-none absolute -right-20 top-10 h-80 w-80 animate-blob rounded-full bg-green/30 blur-3xl" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow !bg-white/10 !text-green-light">
            Become a DatAI Scientist
          </span>
          <h2 className="h-serif text-3xl !text-white sm:text-4xl">
            Your industry, your way!
          </h2>
          <p className="mt-4 max-w-lg text-white/75">
            Your Time, Our Commitment, and the Great Skills Promise to make you a
            Data and AI Scientist for Life in your field of interest or
            expertise.
          </p>
          <a href="#email" className="btn-green group mt-8">
            Enroll Now
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="grid gap-3 sm:grid-cols-2">
            {dataiFeatures.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-green-light/50 hover:bg-white/10"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-shine">
                  <FiCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-white/90">{f}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
