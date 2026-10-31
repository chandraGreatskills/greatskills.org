import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { api, ApiError } from '../lib/api'
import { memberLabel, timeAgo } from '../lib/format'
import type { NetworkItem, NetworkSummary, ProfileCard } from '../lib/types'
import Avatar from '../components/Avatar'
import MemberCard from '../components/MemberCard'
import DemoBadge from '../components/DemoBadge'

const PAGE = 20

const filters = [
  { value: '', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'academia', label: 'Academia' },
  { value: 'industry', label: 'Industry' },
  { value: 'mentor', label: 'Mentors' },
]

type Tab = 'discover' | 'invitations' | 'connections' | 'sent'

// The member's own network first (invitations, connections, sent), and a
// Discover tab for finding new people, the way LinkedIn splits My Network.
export default function Members() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'discover'
  const [summary, setSummary] = useState<NetworkSummary | null>(null)

  const loadSummary = () =>
    api.get<NetworkSummary>('/connections/summary').then(setSummary).catch(() => {})
  useEffect(() => {
    loadSummary()
  }, [tab])

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'discover', label: 'Discover' },
    { value: 'invitations', label: 'Invitations', count: summary?.received },
    { value: 'connections', label: 'My connections', count: summary?.connections },
    { value: 'sent', label: 'Sent', count: summary?.sent },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-navy">Your Network</h1>
        <p className="text-sm text-ink">
          {summary
            ? `${summary.connections} connection${summary.connections === 1 ? '' : 's'}`
            : 'Find members, mentors, industry, and academia to connect with.'}
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-navy/10">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setParams(t.value === 'discover' ? {} : { tab: t.value })}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value ? 'border-green text-green-deep' : 'border-transparent text-navy/60 hover:text-navy'
            }`}
          >
            {t.label}
            {!!t.count && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  t.value === 'invitations' ? 'bg-green text-white' : 'bg-navy-50 text-navy/70'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'discover' && <Discover />}
      {tab !== 'discover' && <MyNetwork tab={tab} onChange={loadSummary} />}
    </div>
  )
}

function Discover() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [members, setMembers] = useState<ProfileCard[]>([])
  const [more, setMore] = useState(false)
  const [notice, setNotice] = useState('')

  const search = async (offset = 0) => {
    const params = new URLSearchParams({ scope: 'discover', limit: String(PAGE), offset: String(offset) })
    if (q) params.set('q', q)
    if (type) params.set('member_type', type)
    try {
      const page = await api.get<ProfileCard[]>(`/members?${params}`)
      setMembers((m) => (offset ? [...m, ...page] : page))
      setMore(page.length === PAGE)
      setNotice('')
    } catch (err) {
      setMembers([])
      setMore(false)
      setNotice(err instanceof ApiError ? err.message : 'Could not load members')
    }
  }
  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            className="field pl-11"
            placeholder="Search by name, headline, industry…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <button onClick={() => search()} className="btn-navy">
          Search
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              type === f.value ? 'bg-green-shine text-white' : 'bg-white text-navy/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <MemberCard key={m.id} m={m} />
        ))}
        {notice && <p className="text-sm text-ink">{notice}</p>}
        {!notice && members.length === 0 && (
          <p className="text-sm text-ink">No members match your search yet.</p>
        )}
      </div>
      {more && (
        <div className="mt-6 text-center">
          <button onClick={() => search(members.length)} className="btn-ghost">
            Show more people
          </button>
        </div>
      )}
    </>
  )
}

const EMPTY: Record<Exclude<Tab, 'discover'>, string> = {
  invitations: 'No invitations right now.',
  connections: "You haven't connected with anyone yet. Try the Discover tab.",
  sent: 'No pending requests.',
}

function MyNetwork({ tab, onChange }: { tab: Exclude<Tab, 'discover'>; onChange: () => void }) {
  const [items, setItems] = useState<NetworkItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const view = tab === 'invitations' ? 'received' : tab

  const load = () =>
    api.get<NetworkItem[]>(`/connections/network?view=${view}&limit=100`).then(setItems).catch(() => setItems([]))
  useEffect(() => {
    setItems(null)
    setFilter('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const act = async (fn: () => Promise<unknown>) => {
    await fn()
    load()
    onChange()
  }
  const respond = (id: string, accept: boolean) =>
    act(() => api.post(`/connections/${id}/respond?accept=${accept}`))
  const drop = (item: NetworkItem, question: string) => {
    if (!window.confirm(question)) return
    act(() => api.del(`/connections/${item.id}`))
  }

  if (!items) return <p className="text-sm text-ink">Loading…</p>

  const needle = filter.trim().toLowerCase()
  const shown = needle
    ? items.filter((i) => `${i.member.full_name} ${i.member.headline ?? ''}`.toLowerCase().includes(needle))
    : items

  return (
    <div className="card p-0">
      {items.length > 8 && (
        <div className="border-b border-navy/5 p-4">
          <input
            className="field"
            placeholder="Filter by name or headline"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}
      {shown.length === 0 && <p className="p-6 text-sm text-ink">{needle ? 'Nobody matches.' : EMPTY[tab]}</p>}
      <ul className="divide-y divide-navy/5">
        {shown.map((item) => {
          const m = item.member
          return (
            <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link to={`/in/${m.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.full_name} url={m.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-navy">
                    <span className="truncate hover:underline">{m.full_name}</span>
                    <DemoBadge show={m.is_demo} />
                  </p>
                  <Headline m={m} />
                  {tab === 'invitations' && item.message && (
                    <p className="mt-1 rounded-lg bg-navy-50 px-3 py-1.5 text-sm text-navy">“{item.message}”</p>
                  )}
                  <p className="text-xs text-ink/80">
                    {tab === 'connections' ? 'Connected' : tab === 'sent' ? 'Sent' : 'Received'} {timeAgo(item.created_at)}
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 gap-2">
                {tab === 'invitations' && (
                  <>
                    <button onClick={() => respond(item.id, false)} className="btn-ghost px-4 py-2">
                      Ignore
                    </button>
                    <button onClick={() => respond(item.id, true)} className="btn-green px-4 py-2">
                      Accept
                    </button>
                  </>
                )}
                {tab === 'sent' && (
                  <button
                    onClick={() => drop(item, `Withdraw your request to ${m.full_name}?`)}
                    className="btn-ghost px-4 py-2"
                  >
                    Withdraw
                  </button>
                )}
                {tab === 'connections' && (
                  <button
                    onClick={() => drop(item, `Remove ${m.full_name} from your connections?`)}
                    className="px-3 py-2 text-xs text-ink hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// The headline, or the member type as a quiet label when there isn't one, so
// "mentor" never reads as someone's headline.
export function Headline({ m }: { m: { headline?: string | null; member_type: string } }) {
  if (m.headline) return <p className="truncate text-sm text-ink">{m.headline}</p>
  return <p className="text-sm italic text-ink/70">{memberLabel(m.member_type)}</p>
}
