import { FiCheck, FiArrowRight } from 'react-icons/fi'
import Reveal from './Reveal'
import { talentHubFeatures } from '../data/site'

export default function TalentHub() {
  return (
    <section id="talent" className="bg-navy-50 py-20 lg:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow">Talent Hub</span>
          <h2 className="h-serif text-3xl sm:text-4xl">
            Breaking the traditional barriers with Talent Hub
          </h2>
          <p className="mt-4 max-w-lg text-ink">
            At Great Skills, we connect talent with opportunity. Whether you’re a
            recent graduate or an experienced professional, our Talent Hub opens
            doors to global career opportunities in leading industries.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {talentHubFeatures.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green/15 text-green-deep">
                  <FiCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-navy/80">{f}</span>
              </div>
            ))}
          </div>

          <a href="#email" className="btn-navy group mt-8">
            Join Talent Hub
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-green-shine opacity-15 blur-2xl" />
            <div className="rounded-[2rem] border border-navy/5 bg-white p-8 shadow-card">
              <div className="mb-6 flex items-center gap-4">
                <img
                  src="/assets/Soni-Sehgal.png"
                  alt="Software Engineer"
                  className="h-14 w-14 rounded-full object-cover ring-4 ring-green/15"
                />
                <div>
                  <p className="font-semibold text-navy">Software Engineer</p>
                  <p className="text-xs text-ink">Placed via Talent Hub</p>
                </div>
              </div>
              <p className="text-lg font-medium leading-relaxed text-navy/80">
                “Thanks to Great Skills, I transitioned to a data science career
                and landed my dream job.”
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-navy-50 p-4 text-center">
                  <p className="h-serif text-2xl font-bold text-navy">1 hr</p>
                  <p className="text-xs text-ink">Daily commitment</p>
                </div>
                <div className="rounded-2xl bg-navy-50 p-4 text-center">
                  <p className="h-serif text-2xl font-bold text-navy">AI</p>
                  <p className="text-xs text-ink">Skill-job matching</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
