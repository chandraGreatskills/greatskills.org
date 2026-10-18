import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import AuthShell from './AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    // Same message whether or not the address has an account, so this page
    // can't be used to find out who is a member.
    return (
      <AuthShell title="Check your email" subtitle="">
        <p className="text-sm leading-relaxed text-ink">
          If <b className="text-navy">{email}</b> has a Great Skills account, a link to choose a new
          password is on its way. It works once, for one hour. Check your spam folder if it doesn't
          arrive in a few minutes.
        </p>
        <p className="mt-6 text-center text-sm text-ink">
          <Link to="/login" className="font-semibold text-green-deep">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <button className="btn-green w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-green-deep">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
