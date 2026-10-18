import { useState } from 'react'
import { FiSend, FiCheckCircle } from 'react-icons/fi'
import Reveal from './Reveal'
import { API_URL } from '../data/site'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot, hidden from people
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/api/v1/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: window.location.pathname, website }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(typeof body?.detail === 'string' ? body.detail : 'Please check your email address and try again.')
      }
      setStatus('sent')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof TypeError ? "We couldn't reach our server. Please try again in a moment." : (err as Error).message)
    }
  }

  return (
    <section id="email" className="bg-white py-20 lg:py-24">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-navy-green px-6 py-14 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 animate-blob rounded-full bg-green/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 animate-blob rounded-full bg-green-light/20 blur-3xl [animation-delay:-8s]" />
            <div className="relative mx-auto max-w-2xl">
              <span className="eyebrow !bg-white/10 !text-green-light">
                Why Great Skills
              </span>
              <h2 className="h-serif text-3xl !text-white sm:text-4xl">
                Why is Great Skills the right choice for you?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/75">
                We deliver innovative learning, an extensive network, and
                invaluable internship programs. Become an insider today…
              </p>

              {status === 'sent' ? (
                <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-green-shine px-6 py-3.5 font-semibold shadow-glow">
                  <FiCheckCircle /> You’re on the list. Welcome aboard!
                </div>
              ) : (
                <form onSubmit={submit} className="mx-auto mt-8 max-w-md">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      maxLength={254}
                      aria-label="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-full border border-white/20 bg-white/95 px-6 py-3.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:ring-2 focus:ring-green-light"
                    />
                    <button type="submit" disabled={status === 'sending'} className="btn-green shrink-0 disabled:opacity-60">
                      {status === 'sending' ? 'Sending…' : <>Submit <FiSend className="h-4 w-4" /></>}
                    </button>
                  </div>
                  {/* Honeypot: off-screen and skipped by keyboard and screen readers, so only bots fill it. */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="absolute -left-[9999px] h-px w-px opacity-0"
                  />
                  {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
