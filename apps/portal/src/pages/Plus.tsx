import { useState } from 'react'
import { FiAward, FiCheck, FiFileText, FiMessageCircle, FiStar, FiTarget } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'

const PERKS = [
  { Icon: FiFileText, title: 'Resume feedback', text: 'Share your resume with your campus career services or a mentor and get comments section by section. Keep every version and see what changed.' },
  { Icon: FiMessageCircle, title: 'Mentor sessions', text: 'Book time with mentors who have open spots, by topic: career switch, interviews, higher studies.' },
  { Icon: FiTarget, title: 'Interview readiness', text: 'Practice plans and checklists tied to the roles you apply for.' },
  { Icon: FiAward, title: 'Priority help from career services', text: 'Your review requests go to the front of the queue.' },
]

// What Achievers Plus includes, and a way to ask for it.
export default function Plus() {
  const { me, refreshMe } = useAuth()
  const [error, setError] = useState('')
  const request = async () => {
    setError('')
    try {
      await api.post('/plus/request')
      await refreshMe()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your request')
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#012652] via-[#0e4f7a] to-[#1f6b3a] p-8 text-white">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#a8d17a]">
          <FiStar className="h-4 w-4 fill-current" /> Achievers Plus
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight">Help from people who hire, when it matters most</h1>
        <p className="mt-3 max-w-xl text-white/80">
          Everything on Great Skills stays free. Plus adds hands-on help with your resume, mentors and interviews.
        </p>
        <div className="mt-6">
          {me?.is_plus ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 font-semibold text-navy">
              <FiCheck className="h-4 w-4 text-green-deep" /> You have Achievers Plus
            </span>
          ) : me?.plus_requested ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 font-semibold">
              <FiCheck className="h-4 w-4" /> Request sent. Our team will be in touch.
            </span>
          ) : (
            <button onClick={request} disabled={!me?.is_verified} className="rounded-full bg-[#6fab2f] px-6 py-2.5 font-semibold text-white hover:bg-[#88c24b] disabled:opacity-50">
              Request access
            </button>
          )}
          {!me?.is_verified && <p className="mt-2 text-sm text-white/70">Verify your email first.</p>}
          {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PERKS.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-navy/10 bg-white p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-green/10 text-green-deep">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold text-navy">{title}</p>
            <p className="mt-1 text-sm leading-6 text-ink">{text}</p>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-green/10 px-5 py-4 text-sm font-semibold text-green-deep">
        Our promise: Plus buys help, never preference. It doesn't change how you're ranked or treated by any employer.
      </p>
    </div>
  )
}
