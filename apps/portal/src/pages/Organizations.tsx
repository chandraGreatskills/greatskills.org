import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheck, FiPlus, FiSearch } from 'react-icons/fi'
import { api } from '../lib/api'
import type { OrgCard } from '../lib/types'
import DemoBadge from '../components/DemoBadge'
import OrgLogo from '../components/OrgLogo'

const TYPES = [
  { value: '', label: 'All' },
  { value: 'academia', label: 'Universities' },
  { value: 'industry', label: 'Companies' },
]

// Every university and company on Great Skills, most followed first.
export default function Organizations() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [orgs, setOrgs] = useState<OrgCard[] | null>(null)

  const load = useCallback(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (type) p.set('type', type)
    return api.get<OrgCard[]>(`/orgs?${p}`).then(setOrgs).catch(() => setOrgs([]))
  }, [q, type])
  useEffect(() => {
    load()
    // Search runs on Enter or the button, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const follow = async (o: OrgCard) => {
    await (o.following ? api.del(`/orgs/${o.slug}/follow`) : api.put(`/orgs/${o.slug}/follow`, {}))
    load()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-navy">Organizations</h1>
        <p className="text-sm text-ink">Universities and companies on Great Skills. Follow them to see their openings first.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
          <input className="field pl-11" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <button onClick={() => load()} className="btn-navy">
          Search
        </button>
      </div>
      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${type === t.value ? 'bg-green-shine text-white' : 'bg-white text-navy/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs?.map((o) => (
          <div key={o.id} className="flex flex-col rounded-xl border border-navy/10 bg-white p-4">
            <Link to={`/org/${o.slug}`} className="group flex items-start gap-3">
              <OrgLogo name={o.name} url={o.logo_url} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-navy group-hover:underline">
                  <span className="truncate">{o.name}</span>
                  <DemoBadge show={o.is_demo} />
                </span>
                <span className="block text-xs text-ink">
                  {o.org_type === 'academia' ? 'University' : 'Company'}
                  {o.location ? ` · ${o.location}` : ''}
                </span>
                {o.tagline && <span className="mt-1 line-clamp-2 block text-sm text-ink">{o.tagline}</span>}
              </span>
            </Link>
            <div className="mt-auto flex items-center justify-between pt-4">
              <span className="text-xs text-ink">
                {o.followers} follower{o.followers === 1 ? '' : 's'}
              </span>
              <button
                onClick={() => follow(o)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-sm font-semibold ${
                  o.following ? 'border border-navy/30 text-navy' : 'border border-navy/60 text-navy hover:bg-navy-50'
                }`}
              >
                {o.following ? <FiCheck className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />} {o.following ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        ))}
        {orgs && orgs.length === 0 && <p className="text-sm text-ink">No organizations match.</p>}
      </div>
    </div>
  )
}
