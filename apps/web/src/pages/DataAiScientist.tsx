import { FiCheck } from 'react-icons/fi'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import DatAiScientist from '../components/DatAiScientist'
import ActionBlocks from '../components/ActionBlocks'
import EmailCapture from '../components/EmailCapture'
import { ProgramGrid, programs } from './Programs'

const related = programs.filter((p) => p.slug !== 'data-ai-scientist')

const shape = [
  { label: 'Length', value: '10 weeks' },
  { label: 'Commitment', value: 'One hour a day' },
  { label: 'Built around', value: 'Your own domain' },
  { label: 'Entry requirement', value: 'None' },
]

/* Deliberately describes only what exists today. Cohort scheduling and a
   self-paced track are planned but unbuilt, so neither is promised here. */
const outcomes = [
  'A portfolio of projects built on data from your own field, not toy datasets.',
  'Weekly assessment feedback that tells you where your skills actually stand.',
  'A Great Skills certificate of completion.',
  'Continued access to our mentors and the wider Great Skills community.',
]

export default function DataAiScientist() {
  return (
    <>
      <PageHero
        eyebrow="Data AI Scientist"
        title="Become a Data and AI Scientist"
        highlight="for life"
        subtitle="Your time, our commitment, and the Great Skills promise to make you a Data and AI Scientist for life in your field of interest or expertise."
        cta={{ label: 'Enroll Now', to: '/connect' }}
        visual={
          <img
            src="/assets/image.png"
            alt="Data AI Scientist program"
            className="w-full rounded-3xl shadow-card"
          />
        }
      />

      <DatAiScientist />

      {/* Shape of the program */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
              {shape.map((s) => (
                <div key={s.label} className="bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-deep">
                    {s.label}
                  </p>
                  <p className="h-serif mt-3 text-2xl">{s.value}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <img
              src="/assets/DatAI-Scientist-AI.jpg"
              alt="Working with real-world data"
              className="w-full rounded-3xl shadow-card"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="h-serif text-3xl sm:text-4xl">Your industry, your way</h2>
            <p className="mt-4 leading-relaxed text-ink">
              The program is built around the domain you already work in. Assignments use
              data from your field, projects mirror the problems your team actually
              solves, and every concept is curated and led by people who have shipped the
              work themselves.
            </p>
            <p className="mt-4 leading-relaxed text-ink">
              Ten weeks, one hour a day. The pace is designed for people holding down a
              full-time job or a full course load, so progress compounds without
              swallowing your calendar.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Who it is for */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="h-serif text-3xl sm:text-4xl">What you need to start</h2>
            <p className="mt-4 leading-relaxed text-ink">
              No degree, no prior data science, no particular job title. We do not screen
              on your background, and there is no entrance test.
            </p>
            <p className="mt-4 leading-relaxed text-ink">
              What matters is that you have a reason to be here: a field you care about, a
              problem you want to solve, or a career you are trying to move. Bring an hour
              a day and the willingness to be a beginner for a few weeks, and we will
              handle the rest. If you can use a computer and read English, you can start.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="h-serif text-3xl sm:text-4xl">What you finish with</h2>
            <ul className="mt-6 space-y-4">
              {outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-shine text-white">
                    <FiCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-relaxed text-ink">{o}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-navy/50">
              The certificate records that you completed the program. It is not a degree
              or an accredited qualification.
            </p>
          </Reveal>
        </div>
      </section>

      <ActionBlocks />

      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="mb-10 max-w-3xl">
            <h2 className="h-serif text-3xl sm:text-4xl">Explore other programs</h2>
          </Reveal>
          <ProgramGrid items={related} columns={3} />
        </div>
      </section>

      <EmailCapture />
    </>
  )
}
