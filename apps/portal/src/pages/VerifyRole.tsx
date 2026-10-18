import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError, api } from '../lib/api'
import { ROLE_LABEL } from '../lib/roles'
import type { RoleKind } from '../lib/types'
import AuthShell from './AuthShell'

type Result = { status: string; kind: RoleKind; org_name: string }

// Opened from the link sent to a school or work address. Often that's a
// different device from the one the member uses, so it works signed out.
export default function VerifyRole() {
  const [params] = useSearchParams()
  const { me } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const token = params.get('token')
    if (!token) {
      setError('This link is missing its code. Open the link from your email again.')
      return
    }
    api
      .post<Result>('/affiliations/confirm', { token })
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Something went wrong'))
  }, [params])

  const next = (
    <Link to={me ? '/profile' : '/login'} className="btn-green mt-6 w-full">
      {me ? 'Go to my profile' : 'Log in'}
    </Link>
  )

  if (error) {
    return (
      <AuthShell title="Link didn't work" subtitle="We couldn't confirm your role with this link.">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        <p className="mt-6 text-sm text-ink">
          Links expire after 48 hours and work once. You can send a fresh one from{' '}
          <strong>Verified roles</strong> on your profile.
        </p>
        {next}
      </AuthShell>
    )
  }

  if (!result) {
    return (
      <AuthShell title="Confirming your role" subtitle="One moment…">
        <p className="text-sm text-ink">Checking your link.</p>
      </AuthShell>
    )
  }

  const role = `${ROLE_LABEL[result.kind]} · ${result.org_name}`
  if (result.status === 'verified') {
    return (
      <AuthShell title="You're verified" subtitle={role}>
        <p className="text-sm text-ink">Your profile now shows a verified badge for this role.</p>
        {next}
      </AuthShell>
    )
  }
  if (result.status === 'awaiting_org') {
    return (
      <AuthShell title="Email confirmed" subtitle={role}>
        <p className="text-sm text-ink">
          Thanks. {result.org_name} is new to Great Skills, so our team checks it before any badges
          appear. You'll see the badge on your profile as soon as it's approved.
        </p>
        {next}
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Couldn't verify" subtitle={role}>
      <p className="text-sm text-ink">
        We couldn't verify this organization. Contact us if you think that's a mistake.
      </p>
      {next}
    </AuthShell>
  )
}
