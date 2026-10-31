import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiAward, FiCheckCircle, FiMapPin, FiX } from 'react-icons/fi'
import { api } from '../lib/api'
import { memberLabel } from '../lib/format'
import { ROLE_LABEL } from '../lib/roles'
import type { MemberMini, ProfileCard } from '../lib/types'
import Avatar from './Avatar'
import ConnectButton from './ConnectButton'
import DemoBadge from './DemoBadge'

function first(name: string) {
  return name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
}

function shortOrg(name: string) {
  return name.replace(/\s+(University|Institute of Technology|College of Engineering)$/i, '')
}

// A suggestion card built around common ground: who you both know, where you
// both are, and what you both do. That's the reason to connect, so it gets
// the middle of the card.
export default function MemberCard({ m, onDismiss }: { m: ProfileCard; onDismiss?: () => void }) {
  const [showMutual, setShowMutual] = useState(false)
  const roles = m.verified_roles ?? []
  const verified = roles.map((r) => `Verified ${ROLE_LABEL[r.kind].toLowerCase()} · ${r.org_name}`).join('\n')
  const sample = m.mutual_sample ?? []
  const n = m.mutual_connections
  const hasCommon = n > 0 || m.shared_orgs?.length > 0 || m.shared_skills?.length > 0

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-navy/10 bg-white p-4 transition hover:border-green/40 hover:shadow-sm">
      <Link to={`/in/${m.handle}`} className="group flex min-w-0 items-start gap-3">
        <Avatar name={m.full_name} url={m.avatar_url} size="card" square />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-navy group-hover:underline">{m.full_name}</span>
            {roles.length > 0 && (
              <span title={verified} className="shrink-0 text-green-deep">
                <FiCheckCircle className="h-4 w-4" />
              </span>
            )}
            <DemoBadge show={m.is_demo} />
          </p>
          <p className="line-clamp-2 text-sm leading-5 text-ink">
            {m.headline || <span className="italic text-ink/70">{memberLabel(m.member_type)}</span>}
          </p>
        </div>
      </Link>

      <div className="mt-3 flex min-h-[3.25rem] flex-col justify-start gap-1.5 border-t border-navy/5 pt-3 text-xs text-ink">
        {n > 0 && (
          <button onClick={() => setShowMutual(true)} className="flex items-center gap-2 text-left hover:text-navy">
            <span className="flex shrink-0">
              {sample.map((p, i) => (
                <span key={p.user_id} className={`rounded-full ring-2 ring-white ${i ? '-ml-2' : ''}`}>
                  <Avatar name={p.full_name} url={p.avatar_url} size="xs" />
                </span>
              ))}
            </span>
            <span className="font-medium underline-offset-2 hover:underline">
              You both know {sample[0] ? first(sample[0].full_name) : `${n} people`}
              {sample[0] && n > 1 ? ` and ${n - 1} other${n === 2 ? '' : 's'}` : ''}
            </span>
          </button>
        )}
        {m.shared_orgs?.map((o) => (
          <span key={o} className="flex items-center gap-2">
            <FiCheckCircle className="h-3.5 w-3.5 shrink-0 text-green-deep" />
            <span className="truncate">Both at {shortOrg(o)}</span>
          </span>
        ))}
        {m.shared_skills?.length > 0 && (
          <span className="flex items-center gap-2">
            <FiAward className="h-3.5 w-3.5 shrink-0 text-green-deep" />
            <span className="truncate">You both list {m.shared_skills.join(', ')}</span>
          </span>
        )}
        {!hasCommon && m.location && (
          <span className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{m.location}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ConnectButton member={m} pill className="flex-1" />
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 text-xs font-medium text-ink hover:text-navy">
            Not now
          </button>
        )}
      </div>

      {showMutual && <MutualList m={m} onClose={() => setShowMutual(false)} />}
    </div>
  )
}

// Everyone you and this member both know, loaded when asked for.
function MutualList({ m, onClose }: { m: ProfileCard; onClose: () => void }) {
  const [people, setPeople] = useState<MemberMini[] | null>(null)
  useEffect(() => {
    api.get<MemberMini[]>(`/members/${m.user_id}/mutual`).then(setPeople).catch(() => setPeople([]))
  }, [m.user_id])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-navy/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Mutual connections with ${m.full_name}`}
      >
        <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
          <p className="font-semibold text-navy">
            You and {first(m.full_name)} both know {m.mutual_connections}
          </p>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[60vh] divide-y divide-navy/5 overflow-y-auto">
          {!people && <li className="px-5 py-4 text-sm text-ink">Loading…</li>}
          {people?.map((p) => (
            <li key={p.user_id}>
              <Link to={`/in/${p.handle}`} onClick={onClose} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50">
                <Avatar name={p.full_name} url={p.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{p.full_name}</p>
                  {p.headline && <p className="truncate text-xs text-ink">{p.headline}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
