import { FiCheckCircle } from 'react-icons/fi'
import { ROLE_LABEL } from '../lib/roles'
import type { VerifiedRole } from '../lib/types'

// Tells readers how strong the proof is. Later methods (roster, document)
// get their own wording here.
function proof(r: VerifiedRole): string {
  const where = r.kind === 'recruiter' ? 'work' : 'school'
  return r.verified_by === 'account_email'
    ? `Verified: signed up with a confirmed ${where} email at ${r.org_name}`
    : `Verified by a ${where} email at ${r.org_name}`
}

// "Verified student · Lakeview State". Only checked roles ever reach here.
export default function RoleBadges({ roles }: { roles?: VerifiedRole[] }) {
  if (!roles?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {roles.map((r) => (
        <span
          key={`${r.kind}-${r.org_slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2.5 py-0.5 text-xs font-semibold text-green-deep"
          title={proof(r)}
        >
          <FiCheckCircle className="h-3 w-3" />
          {ROLE_LABEL[r.kind]} · {r.org_name}
        </span>
      ))}
    </div>
  )
}
