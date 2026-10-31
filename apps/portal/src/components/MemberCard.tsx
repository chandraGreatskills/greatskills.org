import { Link } from 'react-router-dom'
import { FiCheckCircle, FiMapPin, FiX } from 'react-icons/fi'
import { memberLabel } from '../lib/format'
import { ROLE_LABEL } from '../lib/roles'
import type { ProfileCard } from '../lib/types'
import Avatar from './Avatar'
import ConnectButton from './ConnectButton'
import DemoBadge from './DemoBadge'

// Soft cover colors by member type, so a page of cards isn't one flat color.
const COVER: Record<string, string> = {
  student: 'from-[#c9d9ec] to-[#d7e6c6]',
  academia: 'from-[#cfd2ea] to-[#c9d9ec]',
  industry: 'from-[#c6dfd9] to-[#d7e6c6]',
  mentor: 'from-[#eadcbf] to-[#d7e6c6]',
}

function first(name: string) {
  return name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]
}

// "Ravi Iyer is a mutual connection" / "Ravi and 2 other mutual connections".
function mutualText(m: ProfileCard) {
  const n = m.mutual_connections
  if (!m.mutual_name) return `${n} mutual connection${n === 1 ? '' : 's'}`
  if (n === 1) return `${m.mutual_name} is a mutual connection`
  return `${first(m.mutual_name)} and ${n - 1} other mutual connection${n === 2 ? '' : 's'}`
}

// A compact suggestion card in the "People you may know" style.
export default function MemberCard({ m, onDismiss }: { m: ProfileCard; onDismiss?: () => void }) {
  const roles = m.verified_roles ?? []
  const verified = roles.map((r) => `Verified ${ROLE_LABEL[r.kind].toLowerCase()} · ${r.org_name}`).join('\n')
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-navy/10 bg-white">
      {onDismiss && (
        <button
          onClick={onDismiss}
          title="Not now"
          aria-label={`Hide ${m.full_name}`}
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-navy/70 text-white hover:bg-navy"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
      <Link to={`/in/${m.handle}`} className="group flex flex-1 flex-col items-center px-4 text-center">
        <div className={`-mx-4 h-14 self-stretch bg-gradient-to-r ${COVER[m.member_type] ?? COVER.student}`} />
        <div className="-mt-11 rounded-full ring-2 ring-white">
          <Avatar name={m.full_name} url={m.avatar_url} size="xl" />
        </div>
        <p className="mt-2 flex max-w-full items-center justify-center gap-1">
          <span className="truncate text-[15px] font-semibold text-navy group-hover:underline">{m.full_name}</span>
          {roles.length > 0 && (
            <span title={verified} className="shrink-0 text-green-deep">
              <FiCheckCircle className="h-4 w-4" />
            </span>
          )}
        </p>
        <DemoBadge show={m.is_demo} className="mt-0.5" />
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-ink">
          {m.headline || <span className="italic text-ink/70">{memberLabel(m.member_type)}</span>}
        </p>
        <div className="mb-3 mt-auto flex min-h-[2rem] max-w-full items-center gap-2 pt-2 text-left text-xs leading-4 text-ink">
          {m.mutual_connections > 0 ? (
            <>
              {m.mutual_name && <Avatar name={m.mutual_name} url={m.mutual_avatar} size="xs" />}
              <span className="line-clamp-2">{mutualText(m)}</span>
            </>
          ) : m.location ? (
            <>
              <FiMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{m.location}</span>
            </>
          ) : null}
        </div>
      </Link>
      <ConnectButton member={m} pill className="px-4 pb-4" />
    </div>
  )
}
