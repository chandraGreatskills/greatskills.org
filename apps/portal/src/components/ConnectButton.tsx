import { useState } from 'react'
import { FiCheck, FiClock, FiUserPlus, FiUserCheck } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ConnectionState } from '../lib/types'

type Target = {
  user_id?: string | null
  full_name: string
  is_demo?: boolean
  connection: ConnectionState
  connection_id?: string | null
}

// One button that always matches where the member stands with this person:
// Connect, Pending (click to withdraw), Accept, or Connected.
export default function ConnectButton({
  member,
  onChange,
  className = '',
}: {
  member: Target
  onChange?: (state: ConnectionState, connectionId: string | null) => void
  className?: string
}) {
  const { me } = useAuth()
  const [state, setState] = useState(member.connection)
  const [connId, setConnId] = useState(member.connection_id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (s: ConnectionState, id: string | null) => {
    setState(s)
    setConnId(id)
    onChange?.(s, id)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      const c = await api.post<{ id: string; status: string }>('/connections', { addressee_id: member.user_id })
      set(c.status === 'accepted' ? 'connected' : 'sent', c.id)
    })
  const accept = () =>
    run(async () => {
      await api.post(`/connections/${connId}/respond?accept=true`)
      set('connected', connId)
    })
  const withdraw = () => {
    if (!window.confirm(`Withdraw your request to ${member.full_name}?`)) return
    run(async () => {
      await api.del(`/connections/${connId}`)
      set('none', null)
    })
  }

  // Real members can't reach demo accounts, so don't offer a button that fails.
  const blocked = !member.user_id || (member.is_demo && !me?.is_synthetic)
  const base = 'btn-ghost w-full px-4 py-2'

  let button
  if (state === 'connected') {
    button = (
      <span className={`${base} cursor-default border-green/30 bg-green/5 text-green-deep hover:border-green/30`}>
        <FiUserCheck className="h-4 w-4" /> Connected
      </span>
    )
  } else if (state === 'received') {
    button = (
      <button onClick={accept} disabled={busy || blocked} className="btn-green w-full px-4 py-2">
        <FiCheck className="h-4 w-4" /> Accept
      </button>
    )
  } else if (state === 'sent') {
    button = (
      <button onClick={withdraw} disabled={busy} className={base} title="Click to withdraw">
        <FiClock className="h-4 w-4" /> Pending
      </button>
    )
  } else {
    button = (
      <button onClick={connect} disabled={busy || blocked} className={base}
        title={blocked ? 'Demo profiles are for viewing only' : undefined}>
        <FiUserPlus className="h-4 w-4" /> Connect
      </button>
    )
  }

  return (
    <div className={className}>
      {button}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
