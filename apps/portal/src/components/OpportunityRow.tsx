import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBookmark, FiBriefcase, FiClock, FiMapPin, FiUsers } from 'react-icons/fi'
import { api } from '../lib/api'
import { closesLabel, kindLabel, placeLabel, statusLabel, timeAgo } from '../lib/format'
import type { Opportunity } from '../lib/types'
import DemoBadge from './DemoBadge'

// One opening in a list: what, who for, where, when it was posted and when
// it closes. The whole row opens the detail page; the bookmark saves it.
export default function OpportunityRow({ o, onSavedChange }: { o: Opportunity; onSavedChange?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState(o.saved)
  const closes = closesLabel(o)
  const who = o.org?.name ?? o.poster?.full_name

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = !saved
    setSaved(next)
    try {
      if (next) await api.put(`/opportunities/${o.id}/save`, {})
      else await api.del(`/opportunities/${o.id}/save`)
      onSavedChange?.(next)
    } catch {
      setSaved(!next)
    }
  }

  return (
    <Link to={`/opportunities/${o.id}`} className="card flex gap-4 p-5 transition hover:shadow-card">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy-50 text-green-deep">
        {o.org?.logo_url ? <img src={o.org.logo_url} alt="" className="h-full w-full object-cover" /> : <FiBriefcase className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
          {o.title}
          <DemoBadge show={o.is_demo} />
        </p>
        {who && <p className="text-sm text-navy/80">{who}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
          <span className="rounded bg-green/10 px-2 py-0.5 text-xs font-medium text-green-deep">{kindLabel(o.kind)}</span>
          <span className="flex items-center gap-1">
            <FiMapPin className="h-3 w-3" /> {placeLabel(o)}
          </span>
          {o.pay && <span>{o.pay}</span>}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink">
          <span>Posted {timeAgo(o.created_at)}</span>
          {closes && (
            <span className={`flex items-center gap-1 ${closes.urgent ? 'font-semibold text-amber-700' : ''}`}>
              <FiClock className="h-3 w-3" /> {closes.text}
            </span>
          )}
          {o.applicants > 0 && (
            <span className="flex items-center gap-1">
              <FiUsers className="h-3 w-3" /> {o.applicants} applied
            </span>
          )}
          {o.applied_status && (
            <span className="rounded-full bg-navy text-white px-2 py-0.5 font-medium">{statusLabel(o.applied_status)}</span>
          )}
        </p>
      </div>
      {!o.mine && (
        <button
          onClick={toggleSave}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${saved ? 'text-green-deep' : 'text-navy/40 hover:text-navy'}`}
          aria-label={saved ? 'Remove from saved' : 'Save for later'}
          title={saved ? 'Saved' : 'Save for later'}
        >
          <FiBookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
        </button>
      )}
    </Link>
  )
}
