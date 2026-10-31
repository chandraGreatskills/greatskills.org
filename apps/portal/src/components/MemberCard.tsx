import { Link } from 'react-router-dom'
import { FiCheckCircle, FiMapPin, FiUsers } from 'react-icons/fi'
import { memberLabel } from '../lib/format'
import { ROLE_LABEL } from '../lib/roles'
import type { ProfileCard } from '../lib/types'
import Avatar from './Avatar'
import ConnectButton from './ConnectButton'
import DemoBadge from './DemoBadge'

// Soft cover colors by member type, so a page of cards isn't one flat color.
const COVER: Record<string, string> = {
  student: 'from-[#dfe9f5] to-[#e6f0dc]',
  academia: 'from-[#e3e4f3] to-[#dfe9f5]',
  industry: 'from-[#dcebe8] to-[#e6f0dc]',
  mentor: 'from-[#f3ead9] to-[#e6f0dc]',
}

// A suggestion card in the "People you may know" style: cover band, large
// photo, name, two lines of headline, one verified role, and either mutual
// connections or location. The whole top half opens the profile.
export default function MemberCard({ m }: { m: ProfileCard }) {
  const role = m.verified_roles?.[0]
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/in/${m.handle}`} className="group flex flex-1 flex-col items-center px-5 text-center">
        <div className={`-mx-5 h-16 self-stretch bg-gradient-to-r ${COVER[m.member_type] ?? COVER.student}`} />
        <div className="-mt-10 rounded-full ring-4 ring-white">
          <Avatar name={m.full_name} url={m.avatar_url} size="xl" />
        </div>
        <p className="mt-3 flex max-w-full items-center justify-center gap-2">
          <span className="truncate text-base font-semibold text-navy group-hover:underline">{m.full_name}</span>
          <DemoBadge show={m.is_demo} />
        </p>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-ink">
          {m.headline || <span className="italic text-ink/70">{memberLabel(m.member_type)}</span>}
        </p>
        {role && (
          <p className="mt-2 flex max-w-full items-center gap-1 text-xs font-medium text-green-deep" title={`Verified ${ROLE_LABEL[role.kind].toLowerCase()} at ${role.org_name}`}>
            <FiCheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {ROLE_LABEL[role.kind]} · {role.org_name}
            </span>
          </p>
        )}
        <p className="mb-4 mt-auto flex max-w-full items-center gap-1 pt-3 text-xs text-ink">
          {m.mutual_connections > 0 ? (
            <>
              <FiUsers className="h-3.5 w-3.5 shrink-0" />
              {m.mutual_connections} mutual connection{m.mutual_connections === 1 ? '' : 's'}
            </>
          ) : m.location ? (
            <>
              <FiMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{m.location}</span>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
      </Link>
      <ConnectButton member={m} pill className="px-5 pb-5" />
    </div>
  )
}
