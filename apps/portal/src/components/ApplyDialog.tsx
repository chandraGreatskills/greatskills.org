import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Opportunity } from '../lib/types'

// The step between "Apply" and a sent application: pick which resume goes
// with it and add a short note. The poster sees both, nothing else private.
export default function ApplyDialog({
  opp,
  onClose,
  onApplied,
}: {
  opp: Opportunity
  onClose: () => void
  onApplied: () => void
}) {
  const { me } = useAuth()
  const resumes = me?.profile?.resumes ?? []
  const [resumeId, setResumeId] = useState(resumes.find((r) => r.is_primary)?.id ?? resumes[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/opportunities/${opp.id}/apply`, { resume_id: resumeId || null, cover_note: note.trim() || null })
      onApplied()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your application')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-navy/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Apply to ${opp.title}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-navy">Apply to {opp.title}</h2>
            {(opp.org?.name || opp.poster?.full_name) && (
              <p className="text-sm text-ink">{opp.org?.name ?? opp.poster?.full_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-navy/40 hover:text-navy" aria-label="Close">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <label className="label">Resume</label>
        {resumes.length ? (
          <select className="field mb-4" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.filename}{r.is_primary ? ' (primary)' : ''}</option>
            ))}
            <option value="">Send without a resume</option>
          </select>
        ) : (
          <p className="mb-4 rounded-xl bg-navy-50 p-3 text-sm text-navy">
            You haven't uploaded a resume.{' '}
            <Link to="/profile" className="font-medium text-green-deep underline">Add one on your profile</Link>, or apply without it.
          </p>
        )}

        <label className="label">Note to the poster (optional)</label>
        <textarea
          className="field mb-2 min-h-[110px]"
          maxLength={5000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you're a good fit, in a few lines"
        />
        <p className="mb-4 text-xs text-ink">The poster sees your profile card, this note and the resume you pick.</p>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={send} disabled={busy} className="btn-green flex-1">Send application</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
