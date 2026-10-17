import { Link, useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import { legalBySlug, legalDocs } from '../data/legal'

export default function LegalPage() {
  const { pathname } = useLocation()
  const doc = legalBySlug[pathname.replace(/^\/|\/$/g, '')]

  if (!doc) {
    return (
      <>
        <PageHero
          eyebrow="Legal"
          title="Page not"
          highlight="found"
          subtitle="That policy does not exist. Pick one of the notices below instead."
        />
        <section className="bg-white py-16 lg:py-20">
          <div className="container-x max-w-3xl">
            <ul className="space-y-3">
              {legalDocs.map((d) => (
                <li key={d.slug}>
                  <Link to={`/${d.slug}`} className="font-semibold text-green-deep">
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHero eyebrow={doc.eyebrow} title={doc.title} subtitle={doc.intro} />

      <section className="bg-white py-16 lg:py-20">
        <div className="container-x max-w-4xl">
          <Reveal>
            <article className="space-y-5 leading-relaxed text-ink">
              {doc.blocks.map((b, i) => {
                if (b.kind === 'h2') {
                  return (
                    <h2 key={i} className="h-serif pt-6 text-2xl first:pt-0">
                      {b.text}
                    </h2>
                  )
                }
                if (b.kind === 'h3') {
                  return (
                    <h3 key={i} className="h-serif pt-3 text-lg">
                      {b.text}
                    </h3>
                  )
                }
                if (b.kind === 'ul') {
                  return (
                    <ul key={i} className="ml-1 space-y-2.5">
                      {b.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )
                }
                return <p key={i}>{b.text}</p>
              })}
            </article>
          </Reveal>

          <Reveal className="mt-14 border-t border-navy/10 pt-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy">
              Other notices
            </p>
            <div className="flex flex-wrap gap-3">
              {legalDocs
                .filter((d) => d.slug !== doc.slug)
                .map((d) => (
                  <Link
                    key={d.slug}
                    to={`/${d.slug}`}
                    className="rounded-full border border-navy/10 bg-navy-50 px-5 py-2 text-sm font-medium text-navy transition hover:border-green hover:text-green-deep"
                  >
                    {d.title}
                  </Link>
                ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
