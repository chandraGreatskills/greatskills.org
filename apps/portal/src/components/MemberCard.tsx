import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBookOpen, FiBriefcase, FiCheckCircle, FiHeart, FiMapPin, FiSettings, FiUsers, FiX } from 'react-icons/fi'
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

function cap(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
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
  // What this member and the viewer share, as short icon + word items. The
  // full sentence is in each item's tooltip.
  const common: { key: string; Icon: typeof FiUsers; text: string; tip: string }[] = [
    ...(m.shared_orgs ?? []).map((o) => ({
      key: `o-${o}`,
      Icon: /university|institute|college|school/i.test(o) ? FiBookOpen : FiBriefcase,
      text: shortOrg(o),
      tip: `Both at ${o}`,
    })),
    ...(m.shared_city ? [{ key: 'city', Icon: FiMapPin, text: cap(m.shared_city), tip: `Both in ${cap(m.shared_city)}` }] : []),
    ...(m.shared_skills?.length
      ? [{ key: 'skills', Icon: FiSettings, text: m.shared_skills.slice(0, 2).join(', '), tip: `Skills you both list: ${m.shared_skills.join(', ')}` }]
      : []),
    ...(m.shared_interests?.length
      ? [{ key: 'int', Icon: FiHeart, text: m.shared_interests.slice(0, 2).join(', '), tip: `Interests you share: ${m.shared_interests.join(', ')}` }]
      : []),
  ]
  const hasCommon = n > 0 || common.length > 0

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

      <div className="mt-3 min-h-[3.75rem] border-t border-navy/5 pt-3 text-xs text-ink">
        {hasCommon ? (
          <>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink/60">In common</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {n > 0 && (
                <button
                  onClick={() => setShowMutual(true)}
                  title={`You both know ${sample.map((p) => p.full_name).join(', ')}${n > sample.length ? ` and ${n - sample.length} more` : ''}. Click to see everyone.`}
                  className="flex items-center gap-1.5 font-medium text-navy hover:underline"
                >
                  <FiUsers className="h-3.5 w-3.5 shrink-0 text-green-deep" />
                  {sample[0] ? first(sample[0].full_name) : `${n} people`}
                  {sample[0] && n > 1 ? ` + ${n - 1}` : ''}
                </button>
              )}
              {common.map(({ key, Icon, text, tip }) => (
                <span key={key} title={tip} className="flex min-w-0 max-w-full items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-green-deep" />
                  <span className="truncate">{text}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          m.location && (
            <span className="flex items-center gap-1.5">
              <FiMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{m.location}</span>
            </span>
          )
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
