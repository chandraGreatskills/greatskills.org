import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function VerifyBanner() {
  const { me, refreshMe } = useAuth()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  if (!me || me.is_verified) return null

  const resend = async () => {
    setStatus('sending')
    try {
      const r = await api.post<{ status: string }>('/auth/resend-verification')
      // Confirmed in another tab or device: reload so the banner goes away.
      if (r?.status === 'already_confirmed') await refreshMe()
      else setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="border-b border-green/20 bg-green/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-navy">
        <p>
          Please confirm your email address. We sent a link to <strong>{me.email}</strong>.
        </p>
        {status === 'sent' ? (
          <span className="font-semibold text-green-deep">Sent. Check your inbox.</span>
        ) : (
          <button
            onClick={resend}
            disabled={status === 'sending'}
            className="font-semibold text-green-deep underline underline-offset-2 disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : status === 'error' ? 'Try again' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  )
}
