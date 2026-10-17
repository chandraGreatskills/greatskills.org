import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiClock, FiMapPin, FiSearch } from 'react-icons/fi'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import { jobLocations, jobOpenings, jobTypes } from '../data/site'

const ANY_TYPE = 'All Job Type'
const ANY_LOCATION = 'All Job Location'

export default function JobOpenings() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string>(ANY_TYPE)
  const [location, setLocation] = useState<string>(ANY_LOCATION)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobOpenings.filter(
      (job) =>
        (!q || job.title.toLowerCase().includes(q)) &&
        (type === ANY_TYPE || job.type === type) &&
        (location === ANY_LOCATION || job.location === location),
    )
  }, [query, type, location])

  const select =
    'w-full rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm font-medium text-navy outline-none transition focus:border-green focus:ring-2 focus:ring-green/20'

  return (
    <>
      <PageHero
        eyebrow="Job Openings"
        title="Jobs at"
        highlight="Great Skills"
        subtitle="Browse every open role, filter by contract type and location, and find the one that fits."
      />

      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal>
            <div className="grid gap-4 rounded-3xl border border-navy/5 bg-navy-50 p-6 lg:grid-cols-[1.4fr_1fr_1fr]">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  aria-label="Search roles"
                  className={`${select} pl-11`}
                />
              </div>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Filter by job type"
                className={select}
              >
                <option>{ANY_TYPE}</option>
                {jobTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Filter by location"
                className={select}
              >
                <option>{ANY_LOCATION}</option>
                {jobLocations.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </Reveal>

          <p className="mt-6 text-sm text-ink">
            {results.length} {results.length === 1 ? 'role' : 'roles'} open
          </p>

          <div className="mt-4 divide-y divide-navy/10 overflow-hidden rounded-3xl border border-navy/10">
            {results.map((job, i) => (
              <Reveal key={`${job.title}-${job.type}-${job.location}`} delay={i * 0.06}>
                <div className="flex flex-col gap-4 bg-white p-7 transition-colors hover:bg-navy-50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="h-serif text-xl">{job.title}</h2>
                    <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <FiClock className="h-4 w-4 text-green" />
                        {job.type}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiMapPin className="h-4 w-4 text-green" />
                        {job.location}
                      </span>
                    </p>
                  </div>
                  <Link to="/connect" className="btn-navy shrink-0 self-start sm:self-auto">
                    More Details <FiArrowRight />
                  </Link>
                </div>
              </Reveal>
            ))}

            {results.length === 0 && (
              <p className="bg-white p-10 text-center text-ink">
                No roles match those filters right now. Try widening the search.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
