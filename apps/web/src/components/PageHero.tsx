import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiChevronRight } from 'react-icons/fi'
import type { ReactNode } from 'react'

export type HeroStat = { value: string; label: string }

type Props = {
  eyebrow: string
  title: string
  highlight?: string
  subtitle?: string
  /** Inline figures rendered under the subtitle, as on the live Career banner. */
  stats?: HeroStat[]
  cta?: { label: string; to: string }
  /** Right-hand visual. Pass a <HeroCollage /> or any node. */
  visual?: ReactNode
}

/** Inner-page banner: breadcrumb, headline, optional figures and a right-hand visual. */
export default function PageHero({
  eyebrow,
  title,
  highlight,
  subtitle,
  stats,
  cta,
  visual,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-navy-50 pb-16 pt-32 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-6 h-72 w-72 animate-blob rounded-full bg-green/20 blur-3xl" />
        <div className="absolute right-0 top-1/2 h-80 w-80 animate-blob rounded-full bg-navy/10 blur-3xl [animation-delay:-7s]" />
      </div>

      <div
        className={`container-x ${
          visual ? 'grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]' : ''
        }`}
      >
        <div>
          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 flex items-center gap-1.5 text-sm font-medium text-navy/50"
          >
            <Link to="/" className="hover:text-green-deep">
              Home
            </Link>
            <FiChevronRight className="h-3.5 w-3.5" />
            <span className="text-green-deep">{eyebrow}</span>
          </motion.nav>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="h-serif max-w-3xl text-4xl leading-[1.1] sm:text-5xl"
          >
            {title} {highlight && <span className="text-gradient">{highlight}</span>}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-2xl text-lg leading-relaxed text-ink"
            >
              {subtitle}
            </motion.p>
          )}

          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-9 flex flex-wrap gap-x-14 gap-y-6"
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="h-serif text-2xl font-bold text-navy">{s.value}</div>
                  <p className="mt-1 text-sm text-ink">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {cta && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-9"
            >
              <Link to={cta.to} className="btn-green group !uppercase !tracking-wider">
                {cta.label}
                <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </div>

        {visual && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            className="hidden lg:block"
          >
            {visual}
          </motion.div>
        )}
      </div>
    </section>
  )
}
