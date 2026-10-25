import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiBookmark, FiCheck, FiClock, FiFileText, FiMapPin, FiUsers } from 'react-icons/fi'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { closesLabel, kindLabel, placeLabel, statusLabel, timeAgo } from '../lib/format'
import type { Applicant, Opportunity } from '../lib/types'
import ApplyDialog from '../components/ApplyDialog'
import Avatar from '../components/Avatar'
import DemoBadge from '../components/DemoBadge'
import OpportunityForm from '../components/OpportunityForm'
import { Headline } from './Members'

export default function OpportunityDetail() {
  const { id } = useParams()
  const { me } = useAuth()
  const [o, setO] = useState<Opportunity | null>(null)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = () =>
    api
      .get<Opportunity>(`/opportunities/${id}`)
      .then(setO)
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'This opening is not available.' : 'Could not load it.'))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) return <p className="text-sm text-ink">{error}</p>
  if (!o) return <p className="text-navy/50">Loading…</p>

  const closes = closesLabel(o)
  // Real members can't apply to demo openings, so don't offer a button that fails.
  const demoOnly = o.is_demo && !me?.is_synthetic

  const toggleSave = async () => {
    if (o.saved) await api.del(`/opportunities/${o.id}/save`)
    else await api.put(`/opportunities/${o.id}/save`, {})
    setO({ ...o, saved: !o.saved })
  }
  const setOpen = async (open: boolean) => {
    if (!open && !window.confirm('Close this opening? It stops showing in listings and nobody new can apply.')) return
    setO(await api.patch<Opportunity>(`/opportunities/${o.id}`, { status: open ? 'open' : 'closed' }))
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl">
        <OpportunityForm existing={o} onCancel={() => setEditing(false)} onDone={(u) => { setO(u); setEditing(false) }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-1 text-sm text-green-deep">
        <FiArrowLeft className="h-4 w-4" /> All opportunities
      </Link>

      {!o.is_open && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This opening has closed and isn't taking applications.
        </p>
      )}

      <div className="card space-y-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-semibold text-navy">
            {o.title}
            <DemoBadge show={o.is_demo} />
          </h1>
          <p className="mt-1 text-navy/80">
            {o.org?.name ?? (o.poster && (
              <>Posted by <Link to={`/in/${o.poster.handle}`} className="font-medium text-green-deep hover:underline">{o.poster.full_name}</Link></>
            ))}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink">
          <span className="rounded bg-green/10 px-2 py-0.5 text-xs font-medium text-green-deep">{kindLabel(o.kind)}</span>
          <span className="flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" /> {placeLabel(o)}</span>
          <span>Posted {timeAgo(o.created_at)}</span>
          {closes && (
            <span className={`flex items-center gap-1 ${closes.urgent ? 'font-semibold text-amber-700' : ''}`}>
              <FiClock className="h-3.5 w-3.5" /> {closes.text}
            </span>
          )}
          <span className="flex items-center gap-1"><FiUsers className="h-3.5 w-3.5" /> {o.applicants} applied</span>
        </div>

        {(o.pay || o.eligibility) && (
          <dl className="grid gap-3 rounded-xl bg-navy-50 p-4 text-sm sm:grid-cols-2">
            {o.pay && (<div><dt className="label">Pay</dt><dd className="text-navy">{o.pay}</dd></div>)}
            {o.eligibility && (<div><dt className="label">Who can apply</dt><dd className="text-navy">{o.eligibility}</dd></div>)}
          </dl>
        )}

        {o.mine ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(true)} className="btn-ghost">Edit</button>
            {o.status === 'open'
              ? <button onClick={() => setOpen(false)} className="btn-ghost text-red-700">Close opening</button>
              : <button onClick={() => setOpen(true)} className="btn-ghost">Reopen</button>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {o.applied_status ? (
              <span className="btn-ghost cursor-default border-green/30 bg-green/5 text-green-deep">
                <FiCheck className="h-4 w-4" /> {statusLabel(o.applied_status)}
              </span>
            ) : (
              <button
                onClick={() => setApplying(true)}
                disabled={!o.is_open || demoOnly}
                className="btn-green"
                title={demoOnly ? 'Demo openings are for viewing only' : undefined}
              >
                Apply
              </button>
            )}
            <button onClick={toggleSave} className="btn-ghost">
              <FiBookmark className={`h-4 w-4 ${o.saved ? 'fill-current text-green-deep' : ''}`} />
              {o.saved ? 'Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {o.description && (
        <div className="card">
          <h2 className="mb-3 font-serif text-lg font-semibold text-navy">About the role</h2>
          <p className="whitespace-pre-line text-sm text-navy">{o.description}</p>
        </div>
      )}

      {o.skills_wanted.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-serif text-lg font-semibold text-navy">Skills wanted</h2>
          <div className="flex flex-wrap gap-2">
            {o.skills_wanted.map((s) => (
              <span key={s} className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy">{s}</span>
            ))}
          </div>
        </div>
      )}

      {o.mine && <Applicants opp={o} />}

      {applying && (
        <ApplyDialog
          opp={o}
          onClose={() => setApplying(false)}
          onApplied={() => {
            setApplying(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// The poster's words for each status; applicants see statusLabel's instead.
const POSTER_STATUS = [
  ['submitted', 'New'],
  ['reviewed', 'Reviewed'],
  ['shortlisted', 'Shortlisted'],
  ['rejected', 'Not selected'],
  ['accepted', 'Offer made'],
] as const

// The poster's inbox for one opening.
function Applicants({ opp }: { opp: Opportunity }) {
  const [apps, setApps] = useState<Applicant[] | null>(null)
  useEffect(() => {
    api.get<Applicant[]>(`/opportunities/${opp.id}/applications`).then(setApps).catch(() => setApps([]))
  }, [opp.id])

  const setStatus = async (a: Applicant, status: string) => {
    await api.patch(`/opportunities/${opp.id}/applications/${a.id}`, { status })
    setApps((list) => list?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null)
  }

  return (
    <div className="card p-0">
      <h2 className="p-6 pb-3 font-serif text-lg font-semibold text-navy">
        Applicants {apps && <span className="text-sm font-normal text-ink">({apps.length})</span>}
      </h2>
      {!apps && <p className="px-6 pb-6 text-sm text-ink">Loading…</p>}
      {apps?.length === 0 && <p className="px-6 pb-6 text-sm text-ink">No applications yet.</p>}
      <ul className="divide-y divide-navy/5">
        {apps?.map((a) => (
          <li key={a.id} className="space-y-2 p-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to={`/in/${a.member.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={a.member.full_name} url={a.member.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy hover:underline">{a.member.full_name}</p>
                  <Headline m={a.member} />
                  <p className="text-xs text-ink/80">Applied {timeAgo(a.created_at)}</p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {a.has_resume && (
                  <button
                    onClick={() => api.download(`/opportunities/${opp.id}/applications/${a.id}/resume`, a.resume_filename || 'resume')}
                    className="btn-ghost px-3 py-2"
                  >
                    <FiFileText className="h-4 w-4" /> Resume
                  </button>
                )}
                <select
                  className="rounded-lg border border-navy/10 bg-white px-2 py-2 text-sm text-navy"
                  value={a.status}
                  onChange={(e) => setStatus(a, e.target.value)}
                  aria-label={`Status for ${a.member.full_name}`}
                >
                  {POSTER_STATUS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {a.cover_note && <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy">{a.cover_note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
