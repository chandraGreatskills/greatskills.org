import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiBookmark, FiBriefcase, FiCheckCircle, FiCircle, FiEdit3, FiUsers } from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { completion } from '../lib/completion'
import { coverStyle } from '../lib/covers'
import { kindLabel, placeLabel, timeAgo } from '../lib/format'
import type { NetworkSummary, Opportunity, ProfileCard, Recommendation } from '../lib/types'
import Avatar from '../components/Avatar'
import ConnectButton from '../components/ConnectButton'
import DemoBadge from '../components/DemoBadge'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Home: your card on the left, what needs you and what's new in the middle,
// people to meet on the right. On phones the columns stack, middle first.
export default function Feed() {
  const { me } = useAuth()
  const [network, setNetwork] = useState<NetworkSummary | null>(null)
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [members, setMembers] = useState<ProfileCard[]>([])
  const [recsWaiting, setRecsWaiting] = useState(0)

  useEffect(() => {
    api.get<NetworkSummary>('/connections/summary').then(setNetwork).catch(() => {})
    api.get<{ open: number }>('/opportunities/count').then((r) => setOpenCount(r.open)).catch(() => {})
    api.get<Opportunity[]>('/opportunities?limit=6').then(setOpps).catch(() => {})
    api.get<ProfileCard[]>('/members?scope=discover&limit=5').then(setMembers).catch(() => {})
    api
      .get<{ received: Recommendation[] }>('/recommendations/me')
      .then((r) => setRecsWaiting(r.received.filter((x) => x.status === 'pending').length))
      .catch(() => {})
  }, [])

  const p = me?.profile
  const { percent, next } = completion(p)
  const invites = network?.received ?? 0
  const todo = [
    ...(invites ? [{ to: '/members?tab=invitations', Icon: FiUsers, text: `${invites} invitation${invites === 1 ? '' : 's'} to connect`, hot: true }] : []),
    ...(recsWaiting ? [{ to: '/profile', Icon: FiEdit3, text: `${recsWaiting} recommendation${recsWaiting === 1 ? '' : 's'} waiting for your approval`, hot: true }] : []),
    ...next.slice(0, 3).map((step) => ({ to: '/profile', Icon: FiCircle, text: step, hot: false })),
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
              {p.location && <p className="mt-1 text-xs text-ink/80">{p.location}</p>}
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
              <Link to="/opportunities" className="flex items-center gap-2 text-xs font-semibold text-navy hover:text-green-deep">
                <FiBookmark className="h-3.5 w-3.5" /> Saved and applied
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Middle: what needs you, then what's new */}
      <section className="order-1 min-w-0 space-y-4 lg:order-2">
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <h1 className="text-xl font-semibold text-navy">
            {greeting()}, {p?.full_name?.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-ink">
            {openCount === null ? 'Checking what is new…' : `${openCount} open opportunit${openCount === 1 ? 'y' : 'ies'} on Great Skills right now.`}
          </p>
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

        <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="font-semibold text-navy">Latest opportunities</h2>
            <Link to="/opportunities" className="flex items-center gap-1 text-sm font-medium text-green-deep">
              View all <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-navy/5">
            {opps.map((o) => (
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
                      {kindLabel(o.kind)} · {placeLabel(o)}
                    </span>
                    <span className="block text-xs text-ink/70">Posted {timeAgo(o.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {opps.length === 0 && <li className="px-5 py-4 text-sm text-ink">Nothing posted yet.</li>}
          </ul>
        </div>
      </section>

      {/* Right: people to meet */}
      <aside className="order-3 space-y-4">
        <div className="rounded-xl border border-navy/10 bg-white">
          <h2 className="px-4 pt-4 font-semibold text-navy">People you may know</h2>
          <ul className="divide-y divide-navy/5">
            {members.map((m) => (
              <li key={m.id} className="flex gap-3 px-4 py-3">
                <Link to={`/in/${m.handle}`} className="shrink-0">
                  <Avatar name={m.full_name} url={m.avatar_url} size="sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/in/${m.handle}`} className="block truncate text-sm font-semibold text-navy hover:underline">
                    {m.full_name}
                  </Link>
                  <p className="line-clamp-2 text-xs leading-4 text-ink">{m.headline}</p>
                  {m.mutual_connections > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink/80">
                      <FiUsers className="h-3 w-3" /> {m.mutual_connections} mutual
                    </p>
                  )}
                  <ConnectButton member={m} pill className="mt-2 w-32" />
                </div>
              </li>
            ))}
            {members.length === 0 && <li className="px-4 py-3 text-sm text-ink">No suggestions right now.</li>}
          </ul>
          <Link to="/members" className="flex items-center justify-center gap-1 border-t border-navy/5 py-2.5 text-sm font-semibold text-ink hover:bg-navy-50 hover:text-navy">
            Show all <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </div>
  )
}
