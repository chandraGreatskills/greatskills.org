import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi'
import { heroBullets } from '../data/site'

export default function Hero() {
  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-[#e9f5da] lg:min-h-[92svh]"
    >
      {/* soft glow accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 animate-blob rounded-full bg-green/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 animate-blob rounded-full bg-green-light/20 blur-3xl [animation-delay:-10s]" />
      </div>

      {/* curved base: sits behind the student cutout */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[120px] w-full lg:block"
      >
        {/* lands flat on the baseline before the student cutout begins, so she is never sliced */}
        <path d="M0 10C240 0 540 66 740 120L1440 120L0 120Z" fill="#ffffff" />
      </svg>

      <div className="relative mx-auto grid max-w-[1520px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-28 sm:px-8 lg:min-h-[92svh] lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-6 lg:px-10 lg:pb-0 lg:pt-[17vh]">
        {/* Left: copy */}
        <div className="max-w-xl lg:max-w-[46rem]">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-[2rem] font-semibold leading-[1.14] text-[#0f1720] sm:text-[2.5rem] lg:text-[clamp(2.2rem,3.4vw,3.35rem)] lg:leading-[1.12]"
          >
            Unlock Your Potential with{' '}
            <span className="text-green-deep">Great Skills</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-base leading-relaxed text-navy/70 sm:text-lg lg:text-xl"
          >
            Empowering a generation with cutting-edge learning, life-changing
            skills, and unparalleled career opportunities.
          </motion.p>

          <div className="mt-6 space-y-3">
            {heroBullets.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <p className="text-sm text-navy/80 sm:text-[15px] lg:text-[17px]">
                  <span className="font-semibold text-navy">{b.title}:</span>{' '}
                  {b.text}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Link
              to="/programs"
              className="btn-green group !text-xs !uppercase !tracking-wider"
            >
              Discover Our Programs
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/what-we-do"
              className="btn group border-2 border-green bg-white/60 !text-xs !uppercase !tracking-wider text-green-deep backdrop-blur transition-colors hover:bg-green hover:text-white"
            >
              Join the Talent Hub
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Right: student cutout, bottom-aligned so it meets the section base */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="flex justify-center self-end lg:justify-end"
        >
          <img
            src="/assets/great-skills_min-980x1024.webp"
            alt="Learners growing with Great Skills"
            className="w-full max-w-[300px] object-contain sm:max-w-sm lg:max-w-[600px]"
          />
        </motion.div>
      </div>
    </section>
  )
}
