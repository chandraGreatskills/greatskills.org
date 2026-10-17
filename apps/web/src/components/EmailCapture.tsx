import { useState } from 'react'
import { FiSend, FiCheckCircle } from 'react-icons/fi'
import Reveal from './Reveal'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

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

              {sent ? (
                <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-green-shine px-6 py-3.5 font-semibold shadow-glow">
                  <FiCheckCircle /> You’re on the list. Welcome aboard!
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (email) setSent(true)
                  }}
                  className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-full border border-white/20 bg-white/95 px-6 py-3.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:ring-2 focus:ring-green-light"
                  />
                  <button type="submit" className="btn-green shrink-0">
                    Submit <FiSend className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
