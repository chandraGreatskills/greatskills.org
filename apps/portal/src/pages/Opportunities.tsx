import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { api } from '../lib/api'
import { statusLabel, timeAgo } from '../lib/format'
import type { MyApplication, Opportunity } from '../lib/types'
import OpportunityForm from '../components/OpportunityForm'
import OpportunityRow from '../components/OpportunityRow'

const PAGE = 20

const kinds = [
  { value: '', label: 'All' },
  { value: 'employment', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'research', label: 'Research' },
  { value: 'academic', label: 'Academic' },
]

type Tab = 'browse' | 'saved' | 'applied' | 'posted'
const TABS: { value: Tab; label: string }[] = [
  { value: 'browse', label: 'Browse' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'My applications' },
  { value: 'posted', label: 'Posted by me' },
]

export default function Opportunities() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'browse'
  // ?post=1 opens the form straight away, for the Post an opening button on home.
  const [posting, setPosting] = useState(params.get('post') === '1')
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy">Opportunities</h1>
          <p className="text-sm text-ink">Jobs, internships, research, and academic openings.</p>
        </div>
        <button onClick={() => setPosting((v) => !v)} className="btn-green shrink-0">
          <FiPlus className="h-4 w-4" /> Post
        </button>
      </div>

      {posting && (
        <div className="mb-6">
          <OpportunityForm onCancel={() => setPosting(false)} onDone={(o) => navigate(`/opportunities/${o.id}`)} />
        </div>
      )}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-navy/10">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParams(t.value === 'browse' ? {} : { tab: t.value })}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value ? 'border-green text-green-deep' : 'border-transparent text-navy/60 hover:text-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && <Browse />}
      {tab === 'saved' && <Listing query="saved=true" empty="Nothing saved yet. Tap the bookmark on any opening to keep it here." dropOnUnsave />}
      {tab === 'posted' && <Listing query="mine=true" empty="You haven't posted anything yet." />}
      {tab === 'applied' && <Applied />}
    </div>
  )
}

function Browse() {
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [paid, setPaid] = useState(false)
  const [soon, setSoon] = useState(false)
  const [sort, setSort] = useState<'newest' | 'closing'>('newest')
  const [query, setQuery] = useState('')

  // Typing doesn't refetch on every key; Search or Enter applies the text.
  const build = (text = q, place = location) => {
    const p = new URLSearchParams()
    if (kind) p.set('kind', kind)
    if (text.trim()) p.set('q', text.trim())
    if (place.trim()) p.set('location', place.trim())
    if (remote) p.set('remote', 'true')
    if (paid) p.set('paid', 'true')
    if (soon) p.set('closing_soon', 'true')
    if (sort !== 'newest') p.set('sort', sort)
    return p.toString()
  }
  useEffect(() => {
    setQuery(build())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, remote, paid, soon, sort])

  const toggles = [
    { on: remote, set: setRemote, label: 'Remote' },
    { on: paid, set: setPaid, label: 'Paid' },
    { on: soon, set: setSoon, label: 'Closing this week' },
  ]

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            className="field pl-11"
            placeholder="Title or keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setQuery(build())}
          />
        </div>
        <input
          className="field"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQuery(build())}
        />
        <button onClick={() => setQuery(build())} className="btn-navy">Search</button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kinds.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                kind === k.value ? 'bg-green-shine text-white' : 'bg-white text-navy/70'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-navy/10 sm:block" />
        {toggles.map((t) => (
          <button
            key={t.label}
            onClick={() => t.set(!t.on)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              t.on ? 'border-green bg-green/10 text-green-deep' : 'border-navy/10 bg-white text-navy/70'
            }`}
          >
            {t.label}
          </button>
        ))}
        <select
          className="ml-auto rounded-full border border-navy/10 bg-white px-3 py-1.5 text-sm text-navy"
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'closing')}
          aria-label="Sort"
        >
          <option value="newest">Newest first</option>
          <option value="closing">Closing soonest</option>
        </select>
      </div>

      <Listing query={query} empty="No openings match. Try fewer filters." />
    </>
  )
}

function Listing({ query, empty, dropOnUnsave = false }: { query: string; empty: string; dropOnUnsave?: boolean }) {
  const [items, setItems] = useState<Opportunity[] | null>(null)
  const [more, setMore] = useState(false)

  const load = async (offset = 0) => {
    const sep = query ? '&' : ''
    const page = await api.get<Opportunity[]>(`/opportunities?${query}${sep}limit=${PAGE}&offset=${offset}`).catch(() => [])
    setItems((prev) => (offset && prev ? [...prev, ...page] : page))
    setMore(page.length === PAGE)
  }
  useEffect(() => {
    setItems(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  if (!items) return <p className="text-sm text-ink">Loading…</p>
  return (
    <div className="space-y-3">
      {items.map((o) => (
        <OpportunityRow
          key={o.id}
          o={o}
          onSavedChange={(s) => dropOnUnsave && !s && setItems((list) => list?.filter((x) => x.id !== o.id) ?? null)}
        />
      ))}
      {items.length === 0 && <p className="text-sm text-ink">{empty}</p>}
      {more && (
        <div className="pt-3 text-center">
          <button onClick={() => load(items.length)} className="btn-ghost">Show more</button>
        </div>
      )}
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-navy-50 text-navy',
  reviewed: 'bg-blue-50 text-blue-800',
  shortlisted: 'bg-green/10 text-green-deep',
  accepted: 'bg-green text-white',
  rejected: 'bg-red-50 text-red-700',
}

function Applied() {
  const [apps, setApps] = useState<MyApplication[] | null>(null)
  useEffect(() => {
    api.get<MyApplication[]>('/opportunities/applications/mine').then(setApps).catch(() => setApps([]))
  }, [])

  if (!apps) return <p className="text-sm text-ink">Loading…</p>
  if (!apps.length) return <p className="text-sm text-ink">You haven't applied to anything yet.</p>
  return (
    <ul className="card divide-y divide-navy/5 p-0">
      {apps.map((a) => (
        <li key={a.id}>
          <Link to={`/opportunities/${a.opportunity.id}`} className="flex flex-col gap-2 p-4 hover:bg-navy-50/40 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{a.opportunity.title}</p>
              <p className="text-sm text-ink">
                {a.opportunity.org?.name ?? a.opportunity.poster?.full_name}
                {!a.opportunity.is_open && ' · Closed'}
              </p>
              <p className="text-xs text-ink/80">
                Applied {timeAgo(a.created_at)}
                {a.updated_at !== a.created_at && a.status !== 'submitted' && ` · updated ${timeAgo(a.updated_at)}`}
              </p>
            </div>
            <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-center ${STATUS_STYLE[a.status] ?? 'bg-navy-50 text-navy'}`}>
              {statusLabel(a.status)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
