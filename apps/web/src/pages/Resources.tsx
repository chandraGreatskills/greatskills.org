import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiPlus, FiTool, FiCheckCircle, FiClipboard } from 'react-icons/fi'
import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import EmailCapture from '../components/EmailCapture'
import { blogPosts } from '../data/site'

const labFeatures = [
  { icon: FiTool, title: 'Practical Learning', text: 'Hands-on experience with industry-relevant tools and technologies.' },
  { icon: FiCheckCircle, title: 'Skill-Oriented Programs', text: 'Focus on skills directly applicable to your career growth.' },
  { icon: FiClipboard, title: 'Tailored for Success', text: 'From transformation to optimization, labs help achieve your goals.' },
]

const faqs = [
  ['What services does GreatSkills offer?', 'GreatSkills offers personalized training, skill development programs, consulting services, and access to a global Talent Hub for job opportunities.'],
  ['Who can benefit from GreatSkills’ programs?', 'Our programs are designed for students, professionals, and businesses seeking to enhance skills, pursue career growth, or implement digital transformation.'],
  ['What is the Talent Hub, and how does it work?', 'Talent Hub is our platform that connects skilled individuals with global career opportunities. It’s free to use and helps both recent graduates and experienced professionals find their next big role.'],
  ['How do I join the Talent Hub?', 'You can join by clicking the “Join the Talent Hub” button on our homepage and following the registration process.'],
  ['What topics are covered in your learning programs?', 'A wide range of subjects, including AI, Data Science, professional skills, life skills, academic tutoring, and much more.'],
  ['What is the duration of your training programs?', 'It varies by program. Some courses are as short as 10 weeks, while others offer long-term, ongoing support for continuous growth.'],
  ['Do you offer any free resources or training?', 'Yes, we provide extensive free data science training and other resources like weekly blogs, newsletters, and access to labs.'],
  ['What makes GreatSkills different from other platforms?', 'We combine personalized learning, skill development, strategic consulting, and global job opportunities to ensure both personal and professional success.'],
]

export default function Resources() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Success tomorrow starts with"
        highlight="preparation today"
        subtitle="At Great Skills, we provide real-time learning experiences tailored to your personal and professional growth, helping you thrive in an ever-evolving world."
        visual={
          <img
            src="/assets/Resources.png"
            alt="Great Skills resources"
            className="w-full rounded-3xl shadow-card"
          />
        }
      />

      {/* Insights */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <Reveal className="mb-10 flex items-end justify-between">
            <div>
              <span className="eyebrow">Insights</span>
              <h2 className="h-serif text-3xl">Latest from our blog</h2>
            </div>
            <Link
              to="/blogs"
              className="hidden items-center gap-1 text-sm font-semibold text-green-deep sm:flex"
            >
              View all <FiArrowRight />
            </Link>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {blogPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.08}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-card">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.img}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <span className="self-start rounded-full bg-green/10 px-3 py-1 text-xs font-semibold text-green-deep">
                      {post.tag}
                    </span>
                    <h3 className="h-serif mt-3 text-lg">{post.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink">
                      {post.excerpt}
                    </p>
                    <p className="mt-4 text-xs text-navy/40">{post.date}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Labs + Assessments */}
      <section className="bg-navy-50 py-16 lg:py-20">
        <div className="container-x grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl bg-navy-green p-8 text-white">
              <h2 className="h-serif text-2xl !text-white">Labs</h2>
              <p className="mt-3 text-white/70">
                Our hands-on labs let you apply what you’ve learned in a real-world
                setting, using industry tools to see immediate results.
              </p>
              <div className="mt-6 space-y-3">
                {labFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4">
                    <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-green-light" />
                    <div>
                      <p className="font-semibold">{f.title}</p>
                      <p className="text-sm text-white/60">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <img
                src="/assets/Access-to-labs-new.png"
                alt="Inside a Great Skills lab"
                className="mt-7 w-full rounded-2xl"
              />
              <a href="#email" className="btn-green mt-6">Access to labs</a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col justify-between rounded-3xl border border-navy/5 bg-white p-8 shadow-soft">
              <div>
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green/10 text-green-deep">
                  <FiClipboard className="h-7 w-7" />
                </div>
                <h2 className="h-serif text-2xl">Assessments</h2>
                <p className="mt-3 text-ink">
                  At Great Skills, we conduct weekly assessments to measure your progress
                  and readiness. These evaluations provide real-time feedback, helping you
                  refine your skills and stay on track to achieve your personal and
                  professional goals.
                </p>
                <img
                  src="/assets/Assessments.png"
                  alt="Assessment results dashboard"
                  className="mt-7 w-full rounded-2xl"
                />
              </div>
              <a href="#email" className="btn-navy mt-6 self-start">
                Access To Assessments
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x max-w-3xl">
          <Reveal className="mb-10 text-center">
            <span className="eyebrow">FAQ’s</span>
            <h2 className="h-serif text-3xl">Frequently asked questions</h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f[0]} delay={i * 0.03}>
                <Faq q={f[0]} a={f[1]} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <EmailCapture />
    </>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-semibold text-navy">{q}</span>
        <FiPlus
          className={`h-5 w-5 shrink-0 text-green-deep transition-transform ${open ? 'rotate-45' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-ink">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
