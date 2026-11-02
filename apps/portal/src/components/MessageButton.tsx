import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMessageSquare, FiX } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import type { Thread } from '../lib/types'

// "Message": writes the first message (or continues the existing
// conversation) and opens it. The API decides whether it's allowed; if not,
// its reason is shown here.
export default function MessageButton({
  userId,
  name,
  opportunityId,
  className = '',
  label = 'Message',
}: {
  userId: string
  name: string
  opportunityId?: string
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const first = name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const t = await api.post<Thread>('/messages/conversations', { to_user_id: userId, body, opportunity_id: opportunityId })
      navigate(`/messages/${t.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || 'inline-flex items-center gap-2 rounded-full border border-navy/60 px-4 py-1.5 text-sm font-semibold text-navy hover:bg-navy-50'}
      >
        <FiMessageSquare className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-navy/40 sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
          <form onSubmit={send} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-card sm:rounded-2xl" role="dialog">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">Message {first}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50">
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <textarea
              autoFocus
              className="field mt-3 min-h-[120px] text-sm"
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi ${first}, …`}
            />
            {error && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-4 py-1.5 text-sm">
                Cancel
              </button>
              <button disabled={busy || !body.trim()} className="btn-green px-5 py-1.5 text-sm disabled:opacity-50">
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
