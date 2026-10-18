import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import AuthShell from './AuthShell'

export default function ResetPassword() {
  const [params] = useSearchParams()
  // Read the code once, then take it out of the address bar so it doesn't
  // linger in history or get passed along in a Referer header.
  const [token] = useState(() => {
    const t = params.get('token') ?? ''
    if (t) window.history.replaceState(null, '', '/reset-password')
    return t
  })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("The two passwords don't match")
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell title="Link not valid" subtitle="">
        <p className="text-sm text-ink">This link is missing its code. Open the link from your email again, or ask for a new one.</p>
        <p className="mt-6 text-center text-sm">
          <Link to="/forgot-password" className="font-semibold text-green-deep">Send a new link</Link>
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password changed" subtitle="">
        <p className="text-sm leading-relaxed text-ink">
          Your new password is set, and you've been signed out everywhere else. Sign in with your new password.
        </p>
        <Link to="/login" className="btn-green mt-6 w-full">Sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters. A short phrase is easier to remember and harder to guess.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}{' '}
            {error.includes('expired') && (
              <Link to="/forgot-password" className="font-semibold underline">Send a new link</Link>
            )}
          </p>
        )}
        <div>
          <label className="label">New password</label>
          <input className="field" type="password" required minLength={8} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Type it again</label>
          <input className="field" type="password" required minLength={8} autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn-green w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </AuthShell>
  )
}
