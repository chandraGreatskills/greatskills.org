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
  pill = false,
}: {
  member: Target
  onChange?: (state: ConnectionState, connectionId: string | null) => void
  className?: string
  // Rounded outline button, for suggestion cards.
  pill?: boolean
}) {
  const { me } = useAuth()
  const [state, setState] = useState(member.connection)
  const [connId, setConnId] = useState(member.connection_id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)

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

  const connect = (message?: string) =>
    run(async () => {
      const c = await api.post<{ id: string; status: string }>('/connections', {
        addressee_id: member.user_id,
        message: message?.trim() || null,
      })
      setAsking(false)
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
  const base = pill
    ? 'btn w-full rounded-full border border-navy/60 bg-white px-4 py-1.5 font-semibold text-navy hover:border-navy hover:bg-navy-50'
    : 'btn-ghost w-full px-4 py-2'

  let button
  if (state === 'connected') {
    button = (
      <span className={`${base} cursor-default border-green/30 bg-green/5 text-green-deep hover:border-green/30`}>
        <FiUserCheck className="h-4 w-4" /> Connected
      </span>
    )
  } else if (state === 'received') {
    button = (
      <button onClick={accept} disabled={busy || blocked} className={`btn-green w-full ${pill ? 'rounded-full py-1.5' : 'px-4 py-2'}`}>
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
      <button onClick={() => setAsking(true)} disabled={busy || blocked} className={base}
        title={blocked ? 'Demo profiles are for viewing only' : undefined}>
        <FiUserPlus className="h-4 w-4" /> Connect
      </button>
    )
  }

  return (
    <div className={className}>
      {button}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {asking && (
        <NoteDialog name={member.full_name} busy={busy} error={error} onSend={connect} onClose={() => setAsking(false)} />
      )}
    </div>
  )
}

const NOTE_LIMIT = 300

// LinkedIn-style: send the request as is, or with a short note. The limit is
// shown as you type, so a long note never fails on send.
function NoteDialog({
  name,
  busy,
  error,
  onSend,
  onClose,
}: {
  name: string
  busy: boolean
  error: string
  onSend: (message?: string) => void
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const left = NOTE_LIMIT - note.length
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-navy/40 text-left sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Connect with ${name}`}
      >
        <h2 className="font-serif text-lg font-semibold text-navy">Connect with {name}</h2>
        <p className="mb-3 text-sm text-ink">Add a note to say how you know them or why you'd like to connect.</p>
        <textarea
          className="field min-h-[110px]"
          maxLength={NOTE_LIMIT}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
          autoFocus
        />
        <p className={`mt-1 text-right text-xs ${left < 30 ? 'font-semibold text-amber-700' : 'text-ink'}`}>
          {left} of {NOTE_LIMIT} characters left
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={() => onSend(note)} disabled={busy} className="btn-green flex-1">
            {note.trim() ? 'Send with note' : 'Send without a note'}
          </button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
