import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { api } from '../lib/api'
import type { MemberMini } from '../lib/types'
import Avatar from './Avatar'

function first(name: string) {
  return name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
}

// Everyone you and this member both know, loaded when asked for.
export default function MutualList({
  m,
  onClose,
}: {
  m: { user_id?: string | null; full_name: string; mutual_connections: number }
  onClose: () => void
}) {
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
