import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle, FiEdit2, FiEye, FiMapPin } from 'react-icons/fi'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { memberLabel } from '../lib/format'
import { ROLE_LABEL } from '../lib/roles'
import type { Education, Experience, ProfileView } from '../lib/types'
import Avatar from '../components/Avatar'
import ConnectButton from '../components/ConnectButton'
import DemoBadge from '../components/DemoBadge'
import MutualList from '../components/MutualList'

const PREVIEWS = [
  { value: 'public', label: 'Logged-out visitor' },
  { value: 'member', label: 'Member' },
  { value: 'connection', label: 'Connection' },
] as const

const COVER: Record<string, string> = {
  student: 'from-[#c9d9ec] via-[#d3e2d6] to-[#dbe8c8]',
  academia: 'from-[#cfd2ea] via-[#cbd8eb] to-[#d3e2d6]',
  industry: 'from-[#c6dfd9] via-[#d0e4d3] to-[#dbe8c8]',
  mentor: 'from-[#eadcbf] via-[#e1e2c9] to-[#d3e2d6]',
}

const YEAR = new Date().getFullYear()

// "8 yrs", "1 yr", "Less than a year". Profiles store years only.
function span(start?: number | null, end?: number | null) {
  if (!start) return ''
  const n = (end || YEAR) - start
  return n <= 0 ? 'Less than a year' : `${n} yr${n === 1 ? '' : 's'}`
}

function years(start?: number | null, end?: number | null) {
  if (!start) return end ? String(end) : ''
  return `${start} – ${end || 'Present'}`
}

// A colored tile with an organization's initials, until organizations have logos.
const TILE = ['#012652', '#359706', '#7a5af8', '#0e7490', '#b45309', '#be185d']
function OrgTile({ name, size = 'h-12 w-12 text-sm' }: { name: string; size?: string }) {
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w))
  const initials = (words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')
  const color = TILE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILE.length]
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-lg font-bold uppercase text-white`} style={{ background: color }}>
      {initials}
    </div>
  )
}

// Long text clipped to a few lines with a "more" link.
function More({ text, lines = 3 }: { text: string; lines?: 2 | 3 | 4 }) {
  const [open, setOpen] = useState(false)
  const long = text.length > lines * 90
  const clamp = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }[lines]
  return (
    <div className="text-sm leading-6 text-navy">
      <p className={`whitespace-pre-line ${open || !long ? '' : clamp}`}>{text}</p>
      {long && (
        <button onClick={() => setOpen(!open)} className="text-sm font-medium text-ink hover:text-navy">
          {open ? 'Show less' : '…more'}
        </button>
      )}
    </div>
  )
}

// Another member's profile, exactly as the API trimmed it for this viewer.
// An owner opening their own link gets a "viewing as" switcher instead of a
// Connect button.
export default function MemberProfile() {
  const { handle } = useParams()
  const [params, setParams] = useSearchParams()
  const { me } = useAuth()
  const [view, setView] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const [showMutual, setShowMutual] = useState(false)
  const own = me?.profile?.handle === handle
  const as = params.get('as')

  useEffect(() => {
    setView(null)
    setError('')
    const q = own && as ? `?as=${as}` : ''
    api
      .get<ProfileView>(`/profiles/${handle}${q}`)
      .then(setView)
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'This profile is not available.' : 'Could not load this profile.'))
  }, [handle, as, own])

  if (error) return <p className="text-sm text-ink">{error}</p>
  if (!view) return <p className="text-navy/50">Loading profile…</p>

  const exps = [...view.experiences].sort((a, b) => (b.end_year ? b.end_year : 9999) - (a.end_year ? a.end_year : 9999) || (b.start_year ?? 0) - (a.start_year ?? 0))
  const edus = [...view.education].sort((a, b) => (b.end_year ?? 9999) - (a.end_year ?? 9999))
  const current = exps.find((e) => !e.end_year)
  const school = edus[0]
  const roles = view.verified_roles ?? []
  const sample = view.mutual_sample ?? []
  const n = view.mutual_connections ?? 0
  const first = (s: string) => s.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {own && (
        <div className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-white p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm font-medium text-navy">
            <FiEye className="h-4 w-4 text-green-deep" /> Viewing your profile as
          </p>
          <div className="flex flex-wrap gap-2">
            {PREVIEWS.map((p) => (
              <button
                key={p.value}
                onClick={() => setParams({ as: p.value })}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  view.viewer === p.value ? 'bg-navy text-white' : 'bg-navy-50 text-navy/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
        <div className={`h-32 bg-gradient-to-r sm:h-40 ${COVER[view.member_type] ?? COVER.student}`} />
        <div className="px-6 pb-6">
          <div className="-mt-16 flex items-end justify-between">
            <div className="rounded-full ring-4 ring-white">
              <Avatar name={view.full_name} url={view.avatar_url} size="lg" />
            </div>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-navy">
                {view.full_name}
                {roles.length > 0 && (
                  <span title={roles.map((r) => `Verified ${ROLE_LABEL[r.kind].toLowerCase()} · ${r.org_name}`).join('\n')} className="text-green-deep">
                    <FiCheckCircle className="h-5 w-5" />
                  </span>
                )}
                {view.degree && <span className="text-base font-normal text-ink">· {view.degree}</span>}
                <DemoBadge show={view.is_demo} />
              </h1>
              <p className="mt-1 text-base leading-6 text-navy">{view.headline || memberLabel(view.member_type)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink">
                {view.location && (
                  <span className="flex items-center gap-1">
                    <FiMapPin className="h-3.5 w-3.5" /> {view.location}
                  </span>
                )}
                {view.connection_count != null && (
                  <span className="font-medium text-green-deep">
                    {view.location && '· '}
                    {view.connection_count} connection{view.connection_count === 1 ? '' : 's'}
                  </span>
                )}
              </p>
              {(view.open_to_work || view.open_to_mentor) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.open_to_work && <span className="rounded-full bg-green/10 px-2.5 py-0.5 text-xs font-semibold text-green-deep">Open to work</span>}
                  {view.open_to_mentor && <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy">Open to mentor</span>}
                </div>
              )}
              {n > 0 && (
                <button onClick={() => setShowMutual(true)} className="mt-3 flex items-center gap-2 text-left text-sm text-ink hover:text-navy">
                  <span className="flex shrink-0">
                    {sample.map((p, i) => (
                      <span key={p.user_id} className={`rounded-full ring-2 ring-white ${i ? '-ml-2' : ''}`}>
                        <Avatar name={p.full_name} url={p.avatar_url} size="xs" />
                      </span>
                    ))}
                  </span>
                  <span>
                    <b className="font-semibold text-navy">{sample.slice(0, 2).map((p) => first(p.full_name)).join(', ')}</b>
                    {n > 2 ? ` and ${n - 2} other` : ''} mutual connection{n === 1 ? '' : 's'}
                  </span>
                </button>
              )}
            </div>
            {(current || school) && (
              <div className="space-y-3 sm:w-64">
                {current && (
                  <div className="flex items-center gap-3">
                    <OrgTile name={current.company} size="h-9 w-9 text-xs" />
                    <span className="text-sm font-semibold leading-5 text-navy">{current.company}</span>
                  </div>
                )}
                {school && (
                  <div className="flex items-center gap-3">
                    <OrgTile name={school.school} size="h-9 w-9 text-xs" />
                    <span className="text-sm font-semibold leading-5 text-navy">{school.school}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {own ? (
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-1.5 text-sm font-semibold text-white hover:bg-navy-900">
                <FiEdit2 className="h-4 w-4" /> Edit profile
              </Link>
            ) : (
              <ConnectButton className="w-44" pill member={{ ...view, user_id: view.user_id }} />
            )}
          </div>
        </div>
      </div>

      {view.bio && (
        <Section title="About">
          <More text={view.bio} lines={4} />
          {view.bio_truncated && <Hint />}
        </Section>
      )}

      {exps.length > 0 && (
        <Section title="Experience" items={exps} limit={4} render={(e: Experience) => (
          <div className="flex gap-4">
            <OrgTile name={e.company} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-navy">{e.title}</p>
                {!e.end_year && e.start_year && <span className="shrink-0 rounded-md bg-green/10 px-2 py-0.5 text-xs font-semibold text-green-deep">Present</span>}
              </div>
              <p className="text-sm text-navy">{e.company}</p>
              {e.start_year && (
                <p className="text-sm text-ink">
                  {years(e.start_year, e.end_year)} · {span(e.start_year, e.end_year)}
                </p>
              )}
              {e.location && <p className="text-sm text-ink">{e.location}</p>}
              {e.description && <div className="mt-2"><More text={e.description} lines={2} /></div>}
            </div>
          </div>
        )} />
      )}

      {edus.length > 0 && (
        <Section title="Education" items={edus} limit={3} render={(e: Education) => (
          <div className="flex gap-4">
            <OrgTile name={e.school} />
            <div className="min-w-0">
              <p className="font-semibold text-navy">{e.school}</p>
              {(e.degree || e.field) && <p className="text-sm text-navy">{[e.degree, e.field].filter(Boolean).join(', ')}</p>}
              {(e.start_year || e.end_year) && <p className="text-sm text-ink">{years(e.start_year, e.end_year)}</p>}
            </div>
          </div>
        )} />
      )}

      {view.skills.length > 0 && (
        <Section title={`Skills (${view.skills.length})`} items={view.skills} limit={5} render={(s: string) => (
          <p className="font-semibold text-navy">{s}</p>
        )}>
          {view.skills_truncated && <Hint />}
        </Section>
      )}

      {view.interests.length > 0 && (
        <Section title="Interests">
          <div className="flex flex-wrap gap-2">
            {view.interests.map((i) => (
              <span key={i} className="rounded-full border border-navy/15 px-3 py-1 text-sm font-medium text-navy">
                {i}
              </span>
            ))}
          </div>
        </Section>
      )}

      {showMutual && <MutualList m={view} onClose={() => setShowMutual(false)} />}
    </div>
  )
}

// A profile section card. With `items`, it lists them with dividers and a
// "Show all" footer once there are more than `limit`.
function Section<T>({
  title,
  children,
  items,
  limit = 3,
  render,
}: {
  title: string
  children?: React.ReactNode
  items?: T[]
  limit?: number
  render?: (item: T) => React.ReactNode
}) {
  const [all, setAll] = useState(false)
  const shown = items ? (all ? items : items.slice(0, limit)) : []
  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
      <div className="px-6 pt-5">
        <h2 className="mb-3 text-xl font-semibold text-navy">{title}</h2>
        {items && render && (
          <ul className="divide-y divide-navy/5">
            {shown.map((item, i) => (
              <li key={i} className="py-4 first:pt-0">
                {render(item)}
              </li>
            ))}
          </ul>
        )}
        <div className="pb-5">{children}</div>
      </div>
      {items && items.length > limit && (
        <button
          onClick={() => setAll(!all)}
          className="flex w-full items-center justify-center gap-2 border-t border-navy/5 py-3 text-sm font-semibold text-ink hover:bg-navy-50 hover:text-navy"
        >
          {all ? 'Show less' : `Show all ${items.length}`} {!all && <FiArrowRight className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

function Hint() {
  return <p className="mt-2 text-xs text-ink">Sign in to see the full profile.</p>
}
