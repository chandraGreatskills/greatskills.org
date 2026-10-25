import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiUsers, FiBriefcase, FiUserCheck, FiArrowRight, FiCircle } from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { completion } from '../lib/completion'
import { kindLabel, placeLabel, timeAgo } from '../lib/format'
import type { NetworkSummary, Opportunity, ProfileCard } from '../lib/types'
import Avatar from '../components/Avatar'
import ConnectButton from '../components/ConnectButton'
import DemoBadge from '../components/DemoBadge'
import { Headline } from './Members'

export default function Feed() {
  const { me } = useAuth()
  const [network, setNetwork] = useState<NetworkSummary | null>(null)
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [members, setMembers] = useState<ProfileCard[]>([])

  useEffect(() => {
    api.get<NetworkSummary>('/connections/summary').then(setNetwork).catch(() => {})
    api.get<{ open: number }>('/opportunities/count').then((r) => setOpenCount(r.open)).catch(() => {})
    api.get<Opportunity[]>('/opportunities?limit=4').then(setOpps).catch(() => {})
    // Suggestions skip people already connected, and pending ones show as Pending.
    api.get<ProfileCard[]>('/members?scope=discover&limit=4').then(setMembers).catch(() => {})
  }, [])

  const p = me?.profile
  const { percent, next } = completion(p)
  const invites = network?.received ?? 0

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-navy-green p-6 text-white sm:p-8">
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">
          Welcome back, {p?.full_name?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="mt-2 max-w-xl text-white/70">
          Your Great Skills network is where learning turns into opportunity. Complete
          your profile, grow your connections, and explore what's open.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard Icon={FiUserCheck} label="Profile complete" value={`${percent}%`} to="/profile" />
        <StatCard
          Icon={FiUsers}
          label={invites === 1 ? 'Invitation waiting' : 'Invitations waiting'}
          value={String(invites)}
          to="/members?tab=invitations"
          highlight={invites > 0}
        />
        <StatCard
          Icon={FiBriefcase}
          label="Open opportunities"
          value={openCount === null ? '…' : String(openCount)}
          to="/opportunities"
        />
      </div>

      {next.length > 0 && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-serif text-lg font-semibold text-navy">Finish your profile</h2>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-navy-50">
              <div className="h-full rounded-full bg-green" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <ul className="space-y-2">
            {next.slice(0, 3).map((step) => (
              <li key={step}>
                <Link to="/profile" className="flex items-center gap-2 text-sm text-navy hover:text-green-deep">
                  <FiCircle className="h-3.5 w-3.5 text-navy/30" /> {step}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHead title="Latest opportunities" to="/opportunities" />
        <div className="grid gap-3 sm:grid-cols-2">
          {opps.map((o) => (
            <Link key={o.id} to="/opportunities" className="card transition hover:shadow-card">
              <p className="flex items-center gap-2 font-semibold text-navy">
                {o.title}
                <DemoBadge show={o.is_demo} />
              </p>
              <p className="text-sm text-ink">
                {kindLabel(o.kind)} · {placeLabel(o)}
              </p>
              <p className="mt-1 text-xs text-ink/80">Posted {timeAgo(o.created_at)}</p>
            </Link>
          ))}
          {opps.length === 0 && <p className="text-sm text-ink">Nothing posted yet.</p>}
        </div>
      </section>

      <section>
        <SectionHead title="People you may know" to="/members" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m) => (
            <div key={m.id} className="card flex min-w-0 flex-col p-5 text-center">
              <Link to={`/in/${m.handle}`} className="flex w-full min-w-0 flex-col items-center">
                <Avatar name={m.full_name} url={m.avatar_url} />
                <p className="mt-2 max-w-full truncate font-medium text-navy hover:underline">{m.full_name}</p>
                <DemoBadge show={m.is_demo} className="mt-1" />
                <div className="w-full min-w-0">
                  <Headline m={m} />
                </div>
              </Link>
              <ConnectButton member={m} className="mt-auto pt-3" />
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-ink">No suggestions right now.</p>}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  Icon,
  label,
  value,
  to,
  highlight = false,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  to: string
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      className={`card flex items-center gap-4 transition hover:shadow-card ${highlight ? 'ring-2 ring-green/40' : ''}`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-green/10 text-green-deep">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-serif text-2xl font-bold text-navy">{value}</p>
        <p className="text-xs text-ink">{label}</p>
      </div>
    </Link>
  )
}

function SectionHead({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-serif text-lg font-semibold text-navy">{title}</h2>
      <Link to={to} className="flex items-center gap-1 text-sm font-medium text-green-deep">
        View all <FiArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
