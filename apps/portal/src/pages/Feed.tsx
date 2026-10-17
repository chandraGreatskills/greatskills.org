import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiUsers, FiBriefcase, FiUserCheck, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { Opportunity, Profile } from '../lib/types'

export default function Feed() {
  const { me } = useAuth()
  const [pending, setPending] = useState(0)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [members, setMembers] = useState<Profile[]>([])

  useEffect(() => {
    api.get<{ length: number }[]>('/connections/pending').then((r) => setPending(r.length)).catch(() => {})
    api.get<Opportunity[]>('/opportunities?limit=4').then(setOpps).catch(() => {})
    api.get<Profile[]>('/members?limit=4').then(setMembers).catch(() => {})
  }, [])

  const p = me?.profile
  const completion = p
    ? Math.round(
        ([p.headline, p.bio, p.location, p.industry, p.skills.length, p.avatar_url].filter(
          Boolean,
        ).length /
          6) *
          100,
      )
    : 0

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-navy-green p-8 text-white">
        <h1 className="font-serif text-3xl font-semibold">
          Welcome back, {p?.full_name?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="mt-2 max-w-xl text-white/70">
          Your Great Skills network is where learning turns into opportunity. Complete
          your profile, grow your connections, and explore what's open.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard Icon={FiUserCheck} label="Profile complete" value={`${completion}%`} to="/profile" />
        <StatCard Icon={FiUsers} label="Pending requests" value={String(pending)} to="/members" />
        <StatCard Icon={FiBriefcase} label="Open opportunities" value={String(opps.length)} to="/opportunities" />
      </div>

      <section>
        <SectionHead title="Latest opportunities" to="/opportunities" />
        <div className="grid gap-3 sm:grid-cols-2">
          {opps.map((o) => (
            <div key={o.id} className="card">
              <p className="font-semibold text-navy">{o.title}</p>
              <p className="text-sm text-ink">
                {o.kind} · {o.remote ? 'Remote' : o.location || 'On-site'}
              </p>
            </div>
          ))}
          {opps.length === 0 && <p className="text-sm text-ink">Nothing posted yet.</p>}
        </div>
      </section>

      <section>
        <SectionHead title="People you may know" to="/members" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m) => (
            <div key={m.id} className="card text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy-50 font-serif text-lg font-bold text-navy">
                {m.full_name[0]}
              </div>
              <p className="mt-2 truncate font-medium text-navy">{m.full_name}</p>
              <p className="truncate text-xs text-ink">{m.headline || m.member_type}</p>
            </div>
          ))}
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
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  to: string
}) {
  return (
    <Link to={to} className="card flex items-center gap-4 transition hover:shadow-card">
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
