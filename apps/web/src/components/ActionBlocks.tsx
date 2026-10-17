import { FiArrowRight } from 'react-icons/fi'
import Reveal from './Reveal'
import { actionBlocks } from '../data/site'

export default function ActionBlocks() {
  return (
    <section id="resources" className="bg-white py-20 lg:py-24">
      <div className="container-x grid gap-6 md:grid-cols-3">
        {actionBlocks.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.1}>
            <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-card">
              <div className="overflow-hidden bg-navy-50">
                <img
                  src={b.img}
                  alt={b.title}
                  className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="h-serif mb-2 text-xl">{b.title}</h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-ink">
                  {b.text}
                </p>
                <a
                  href="#email"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-green-deep"
                >
                  {b.cta}
                  <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
