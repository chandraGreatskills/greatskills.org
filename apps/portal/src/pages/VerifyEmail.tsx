import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError, api } from '../lib/api'
import AuthShell from './AuthShell'

type State = 'checking' | 'done' | 'failed'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const { me, refreshMe } = useAuth()
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState('')
  // StrictMode runs effects twice in dev; the token only needs posting once.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const token = params.get('token')
    if (!token) {
      setError('This link is missing its code. Open the link from your email again.')
      setState('failed')
      return
    }
    api
      .post('/auth/verify-email', { token })
      .then(async () => {
        await refreshMe()
        setState('done')
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Something went wrong')
        setState('failed')
      })
  }, [params, refreshMe])

  if (state === 'checking') {
    return (
      <AuthShell title="Verifying your email" subtitle="One moment…">
        <p className="text-sm text-ink">Checking your link.</p>
      </AuthShell>
    )
  }

  if (state === 'done') {
    return (
      <AuthShell title="Email verified" subtitle="Thanks, your email address is confirmed.">
        <Link to={me ? '/' : '/login'} className="btn-green w-full">
          {me ? 'Go to the portal' : 'Log in'}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Link didn't work" subtitle="We couldn't verify your email with this link.">
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      <p className="mt-6 text-sm text-ink">
        Links expire after 48 hours. Log in and use <strong>Resend email</strong> on the banner
        at the top of the portal to get a fresh one.
      </p>
      <Link to={me ? '/' : '/login'} className="btn-ghost mt-6 w-full">
        {me ? 'Go to the portal' : 'Log in'}
      </Link>
    </AuthShell>
  )
}
