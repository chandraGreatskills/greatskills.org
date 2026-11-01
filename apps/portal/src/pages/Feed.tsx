import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  FiArrowRight, FiBookmark, FiBriefcase, FiCheckCircle, FiCircle, FiEdit3, FiPlus, FiUsers,
} from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { completion } from '../lib/completion'
import { coverStyle } from '../lib/covers'
import { kindLabel, statusLabel, timeAgo } from '../lib/format'
import type { Home, HomeRole, NetworkSummary, Recommendation } from '../lib/types'
import Avatar from '../components/Avatar'
import DemoBadge from '../components/DemoBadge'

const ROLE_LABEL: Record<HomeRole, string> = {
  student: 'Student',
  seeker: 'Job seeker',
  mentor: 'Mentor',
  employer: 'Hiring',
  campus: 'Campus',
  admin: 'Admin',
}

// One line under the greeting, per role.
const INTRO: Record<HomeRole, string> = {
  student: 'Openings matched to your skills, and where your applications stand.',
  seeker: 'Roles that fit your skills, and where your applications stand.',
  mentor: 'People in your network you can help, and your mentoring at a glance.',
  employer: 'Your open roles, new applicants, and talent that fits.',
  campus: 'Your students\' placement at a glance, and who needs a nudge.',
  admin: 'What needs review, and how the network is growing.',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-navy-50 text-navy',
  reviewed: 'bg-sky-50 text-sky-700',
  shortlisted: 'bg-amber-50 text-amber-700',
  accepted: 'bg-green/10 text-green-deep',
  rejected: 'bg-slate-100 text-slate-500',
}

// Home, shaped for the viewer's role. Your card on the left, what needs you
// and what's new for your role in the middle, the right people on the right.
export default function Feed() {
  const { me } = useAuth()
  const [params, setParams] = useSearchParams()
  const [home, setHome] = useState<Home | null>(null)
  const [network, setNetwork] = useState<NetworkSummary | null>(null)
  const [recsWaiting, setRecsWaiting] = useState(0)
  const asRole = params.get('as')

  useEffect(() => {
    api.get<Home>(`/home${asRole ? `?as=${asRole}` : ''}`).then(setHome).catch(() => {})
  }, [asRole])
  useEffect(() => {
    api.get<NetworkSummary>('/connections/summary').then(setNetwork).catch(() => {})
    api
      .get<{ received: Recommendation[] }>('/recommendations/me')
      .then((r) => setRecsWaiting(r.received.filter((x) => x.status === 'pending').length))
      .catch(() => {})
  }, [])

  const p = me?.profile
  const { percent, next } = completion(p)
  const invites = network?.received ?? 0
  const role = home?.role
  const todo = [
    ...(invites ? [{ to: '/members?tab=invitations', Icon: FiUsers, text: `${invites} invitation${invites === 1 ? '' : 's'} to connect`, hot: true }] : []),
    ...(recsWaiting ? [{ to: '/profile', Icon: FiEdit3, text: `${recsWaiting} recommendation${recsWaiting === 1 ? '' : 's'} waiting for your approval`, hot: true }] : []),
    ...(role === 'employer' && home?.stats.find((s) => s.label === 'New to review')?.value
      ? [{ to: '/opportunities?tab=posted', Icon: FiBriefcase, text: `${home.stats.find((s) => s.label === 'New to review')!.value} new applicants to review`, hot: true }]
      : []),
    ...(role === 'admin' && home?.stats[0]?.value
      ? [{ to: '/admin', Icon: FiCheckCircle, text: `${home.stats[0].value} organization${home.stats[0].value === 1 ? '' : 's'} waiting for review`, hot: true }]
      : []),
    // Resume and job-hunting steps are for learners; staff and recruiters skip them.
    ...next
      .filter((step) => role === 'student' || role === 'seeker' || !/resume/i.test(step))
      .slice(0, 2)
      .map((step) => ({ to: '/profile', Icon: FiCircle, text: step, hot: false })),
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
      {/* Left: you */}
      <aside className="order-2 space-y-4 lg:order-1">
        {p && (
          <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
            <div className="h-16" style={coverStyle(p.cover, p.member_type)} />
            <div className="px-4 pb-4">
              <Link to={`/in/${p.handle}`} className="-mt-9 block w-fit rounded-full ring-4 ring-white">
                <Avatar name={p.full_name} url={p.avatar_url} size="row" />
              </Link>
              <Link to={`/in/${p.handle}`} className="mt-2 block font-semibold text-navy hover:underline">
                {p.full_name}
              </Link>
              <p className="line-clamp-2 text-xs leading-5 text-ink">{p.headline || 'Add a headline so people know what you do'}</p>
              {home?.org_name && <p className="mt-1 text-xs font-medium text-green-deep">{home.org_name}</p>}
            </div>
            <div className="space-y-3 border-t border-navy/5 px-4 py-3 text-xs">
              <Link to="/members?tab=connections" className="flex items-center justify-between text-ink hover:text-navy">
                <span>
                  Connections
                  <span className="block text-[11px] text-ink/70">Grow your network</span>
                </span>
                <b className="text-green-deep">{network?.connections ?? '…'}</b>
              </Link>
              <Link to="/profile" className="block text-ink hover:text-navy">
                <span className="flex items-center justify-between">
                  Profile strength <b className="text-navy">{percent}%</b>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-navy-50">
                  <span className="block h-full rounded-full bg-green" style={{ width: `${percent}%` }} />
                </span>
              </Link>
            </div>
            <div className="border-t border-navy/5 px-4 py-3">
              <Link to="/opportunities?tab=applied" className="flex items-center gap-2 text-xs font-semibold text-navy hover:text-green-deep">
                <FiBookmark className="h-3.5 w-3.5" /> {role === 'employer' ? 'Your openings' : 'Saved and applied'}
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Middle: what needs you, then your role's view */}
      <section className="order-1 min-w-0 space-y-4 lg:order-2">
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-navy">
                {greeting()}, {p?.full_name?.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0] ?? 'there'}
              </h1>
              <p className="mt-0.5 text-sm text-ink">{role ? INTRO[role] : 'Loading your home…'}</p>
            </div>
            {home && home.roles.length > 1 && (
              <div className="flex items-center gap-1 rounded-full bg-navy-50 p-1" role="tablist" aria-label="Viewing as">
                {home.roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setParams(r === home.roles[0] ? {} : { as: r })}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${role === r ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy'}`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {home && home.stats.length > 0 && (
            <div className={`mt-4 grid gap-3 ${home.stats.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {home.stats.slice(0, 4).map((s) => (
                <div key={s.label} className="rounded-lg bg-navy-50/70 px-3 py-2.5">
                  <p className="text-2xl font-bold text-navy">{s.value}</p>
                  <p className="text-xs text-ink">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {role === 'employer' && (
            <Link to="/opportunities?post=1" className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-900">
              <FiPlus className="h-4 w-4" /> Post an opening
            </Link>
          )}
          {role === 'campus' && home?.org_name && (
            <Link to="/opportunities?post=1" className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-900">
              <FiPlus className="h-4 w-4" /> Post a research or teaching role
            </Link>
          )}

          {todo.length > 0 ? (
            <ul className="mt-4 divide-y divide-navy/5 rounded-lg border border-navy/10">
              {todo.map(({ to, Icon, text, hot }) => (
                <li key={text}>
                  <Link to={to} className="flex items-center gap-3 px-4 py-2.5 text-sm text-navy hover:bg-navy-50">
                    <Icon className={`h-4 w-4 shrink-0 ${hot ? 'text-green-deep' : 'text-navy/30'}`} />
                    <span className={hot ? 'font-semibold' : ''}>{text}</span>
                    <FiArrowRight className="ml-auto h-4 w-4 text-navy/30" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm text-green-deep">
              <FiCheckCircle className="h-4 w-4" /> You're all caught up.
            </p>
          )}
        </div>

        {home && home.applications.length > 0 && (
          <Panel
            title={role === 'employer' ? 'New applicants' : role === 'campus' ? 'Your students\' latest applications' : 'Your applications'}
            to={role === 'student' || role === 'seeker' ? '/opportunities?tab=applied' : undefined}
          >
            {home.applications.map((a) => (
              <li key={a.id}>
                <Link to={`/opportunities/${a.opportunity_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/60">
                  {a.person ? (
                    <Avatar name={a.person.full_name} url={a.person.avatar_url} size="sm" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy">
                      <FiBriefcase className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy">{a.person ? a.person.full_name : a.title}</span>
                    <span className="block truncate text-sm text-ink">
                      {a.person ? `Applied to ${a.title}` : a.org_name || 'Opening'} · {timeAgo(a.created_at)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[a.status] ?? 'bg-navy-50 text-navy'}`}>
                    {statusLabel(a.status)}
                  </span>
                </Link>
              </li>
            ))}
          </Panel>
        )}

        {home && home.openings.length > 0 && (
          <Panel
            title={
              role === 'employer' ? 'Your openings' : role === 'campus' ? `Openings at ${home.org_name}` : role === 'admin' ? 'Latest openings' : 'Matched to your skills'
            }
            to={role === 'employer' ? '/opportunities?tab=posted' : '/opportunities'}
          >
            {home.openings.map((o) => (
              <li key={o.id}>
                <Link to={`/opportunities/${o.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-navy-50/60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy">
                    <FiBriefcase className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-navy">
                      <span className="truncate">{o.title}</span>
                      <DemoBadge show={o.is_demo} />
                    </span>
                    <span className="block text-sm text-ink">
                      {kindLabel(o.kind)}
                      {o.org_name ? ` · ${o.org_name}` : ''}
                      {o.remote ? ' · Remote' : o.location ? ` · ${o.location}` : ''}
                    </span>
                    {role === 'employer' ? (
                      <span className="block text-xs text-ink/80">
                        {o.applicants} applicant{o.applicants === 1 ? '' : 's'}
                        {o.new_applicants > 0 && <b className="text-green-deep"> · {o.new_applicants} new</b>}
                      </span>
                    ) : o.matched_skills.length > 0 ? (
                      <span className="block text-xs font-medium text-green-deep">Matches your {o.matched_skills.join(', ')}</span>
                    ) : (
                      <span className="block text-xs text-ink/70">Posted {timeAgo(o.created_at)}</span>
                    )}
                  </span>
                  {role === 'employer' && o.new_applicants > 0 && (
                    <span className="shrink-0 rounded-full bg-green-deep px-2 py-0.5 text-xs font-bold text-white">{o.new_applicants}</span>
                  )}
                </Link>
              </li>
            ))}
          </Panel>
        )}
      </section>

      {/* Right: the right people for this role */}
      <aside className="order-3 space-y-4">
        {home && home.people_title && (
          <div className="rounded-xl border border-navy/10 bg-white">
            <h2 className="px-4 pt-4 font-semibold text-navy">{home.people_title}</h2>
            <ul className="divide-y divide-navy/5">
              {home.people.map(({ person, note }) => (
                <li key={person.user_id}>
                  <Link to={`/in/${person.handle}`} className="flex gap-3 px-4 py-3 hover:bg-navy-50/60">
                    <Avatar name={person.full_name} url={person.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">{person.full_name}</span>
                      <span className="line-clamp-2 text-xs leading-4 text-ink">{note || person.headline}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {home.people.length === 0 && <li className="px-4 py-3 text-sm text-ink">Nobody to show yet.</li>}
            </ul>
            <Link to="/members" className="flex items-center justify-center gap-1 border-t border-navy/5 py-2.5 text-sm font-semibold text-ink hover:bg-navy-50 hover:text-navy">
              Find more people <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}

function Panel({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="font-semibold text-navy">{title}</h2>
        {to && (
          <Link to={to} className="flex items-center gap-1 text-sm font-medium text-green-deep">
            View all <FiArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <ul className="mt-2 divide-y divide-navy/5">{children}</ul>
    </div>
  )
}
