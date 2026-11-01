import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FiEdit3, FiX } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { RELATIONSHIPS, relationLine } from '../lib/recommendations'
import type { Recommendation, RelationshipKind } from '../lib/types'
import Avatar from './Avatar'

const MIN = 50
const MAX = 3000

function when(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

// One recommendation: who wrote it (or who it's for), how they know each
// other, when, and the text.
export function RecommendationItem({
  r,
  side,
  owner,
  children,
}: {
  r: Recommendation
  side: 'received' | 'given'
  owner: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const long = r.body.length > 280
  const author = side === 'received' ? r.person.full_name : owner
  const recipient = side === 'received' ? owner : r.person.full_name
  return (
    <div className="flex gap-3">
      <Link to={`/in/${r.person.handle}`} className="shrink-0">
        <Avatar name={r.person.full_name} url={r.person.avatar_url} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/in/${r.person.handle}`} className="font-semibold text-navy hover:underline">
          {r.person.full_name}
        </Link>
        {r.person.headline && <p className="truncate text-sm text-ink">{r.person.headline}</p>}
        <p className="text-xs text-ink/80">
          {when(r.updated_at)} · {relationLine(r.relationship_kind, author, recipient)}
        </p>
        <p className={`mt-2 whitespace-pre-line text-sm leading-6 text-navy ${open || !long ? '' : 'line-clamp-3'}`}>{r.body}</p>
        {long && (
          <button onClick={() => setOpen(!open)} className="text-sm font-medium text-ink hover:text-navy">
            {open ? 'Show less' : '…more'}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

// The profile section: Received and Given tabs, plus a button to write one
// when the viewer is connected to this member.
export function RecommendationsSection({
  name,
  received,
  given,
  canWrite,
  recipientId,
  onWritten,
}: {
  name: string
  received: Recommendation[]
  given: Recommendation[]
  canWrite: boolean
  recipientId?: string | null
  onWritten: () => void
}) {
  const [tab, setTab] = useState<'received' | 'given'>('received')
  const [writing, setWriting] = useState(false)
  const [done, setDone] = useState(false)
  const first = name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
  const list = tab === 'received' ? received : given
  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-white px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-navy">Recommendations</h2>
        {canWrite && recipientId && (
          <button
            onClick={() => setWriting(true)}
            className="inline-flex items-center gap-2 rounded-full border border-navy/60 px-4 py-1 text-sm font-semibold text-navy hover:bg-navy-50"
          >
            <FiEdit3 className="h-4 w-4" /> Recommend {first}
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {(['received', 'given'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              tab === t ? 'bg-green-deep text-white' : 'border border-navy/20 text-navy/70 hover:bg-navy-50'
            }`}
          >
            {t === 'received' ? 'Received' : 'Given'}
            {(t === 'received' ? received : given).length > 0 && ` (${(t === 'received' ? received : given).length})`}
          </button>
        ))}
      </div>
      {done && (
        <p className="mt-4 rounded-lg bg-green/10 px-4 py-3 text-sm text-green-deep">
          Sent. It appears here once {first} accepts it.
        </p>
      )}
      <ul className="mt-4 divide-y divide-navy/5">
        {list.map((r) => (
          <li key={r.id} className="py-4 first:pt-0">
            <RecommendationItem r={r} side={tab} owner={name} />
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <div className="py-2">
          <p className="font-semibold text-navy">Nothing to see for now</p>
          <p className="text-sm text-ink">
            {tab === 'received'
              ? `Recommendations ${first} receives will appear here.`
              : `Recommendations ${first} writes for others will appear here.`}
          </p>
        </div>
      )}
      {writing && recipientId && (
        <WriteDialog
          name={name}
          recipientId={recipientId}
          onClose={() => setWriting(false)}
          onSent={() => {
            setWriting(false)
            setDone(true)
            onWritten()
          }}
        />
      )}
    </div>
  )
}

function WriteDialog({
  name,
  recipientId,
  onClose,
  onSent,
}: {
  name: string
  recipientId: string
  onClose: () => void
  onSent: () => void
}) {
  const [kind, setKind] = useState<RelationshipKind>('worked_with')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const first = name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/recommendations', { recipient_id: recipientId, relationship_kind: kind, body })
      onSent()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  const n = body.trim().length
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-navy/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={send}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-card sm:rounded-2xl"
        role="dialog"
        aria-label={`Recommend ${name}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy">Recommend {first}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink">{first} sees it first and decides whether to show it on their profile.</p>
        <label className="label mt-4">How do you know {first}?</label>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as RelationshipKind)}>
          {RELATIONSHIPS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label className="label mt-4">Your recommendation</label>
        <textarea
          className="field min-h-[160px]"
          value={body}
          maxLength={MAX}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`What is ${first} great at? A specific example helps most.`}
        />
        <p className={`mt-1 text-xs ${n > 0 && n < MIN ? 'text-amber-700' : 'text-ink'}`}>
          {n < MIN ? `At least ${MIN} characters (${MIN - n} to go)` : `${MAX - body.length} characters left`}
        </p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy || n < MIN} className="btn-green disabled:opacity-50">
            Send recommendation
          </button>
        </div>
      </form>
    </div>
  )
}
