import { useEffect, useState, type FormEvent } from 'react'
import { FiAward, FiCheckCircle, FiClock, FiMail, FiTrash2, FiXCircle, FiZap } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Affiliation, RoleKind, RoleSuggestion } from '../lib/types'
import { ROLE_LABEL } from '../lib/roles'

const KIND_HELP: Record<RoleKind, string> = {
  student: 'Use your school or university email.',
  alumni: 'Use a school email that still works, such as an alumni address.',
  faculty: 'Use your university email.',
  recruiter: 'Use your work email at the company you hire for.',
}

function Status({ a }: { a: Affiliation }) {
  const map: Record<string, [string, string, typeof FiCheckCircle]> = {
    verified: ['Verified', 'bg-green/10 text-green-deep', FiCheckCircle],
    email_sent: [`Check ${a.email}`, 'bg-amber-50 text-amber-700', FiMail],
    awaiting_org: ['Waiting for our team to approve this organization', 'bg-navy-50 text-navy/80', FiClock],
    rejected: ["Couldn't be verified", 'bg-red-50 text-red-600', FiXCircle],
    revoked: ['Verification withdrawn', 'bg-red-50 text-red-600', FiXCircle],
  }
  const [text, cls, Icon] = map[a.status] ?? [a.status, 'bg-navy-50 text-navy/80', FiClock]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  )
}

const SUGGEST_LABEL: Record<RoleKind, string> = {
  student: "I'm a student",
  alumni: 'I graduated',
  faculty: 'I teach or research',
  recruiter: 'I hire here',
}

// "Not now" is remembered per organization in this browser only.
const dismissKey = (org: string) => `gs-role-offer-dismissed:${org}`
function wasDismissed(org: string): boolean {
  try {
    return localStorage.getItem(dismissKey(org)) === '1'
  } catch {
    return false
  }
}

export default function RolesCard() {
  const { me } = useAuth()
  const [rows, setRows] = useState<Affiliation[]>([])
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<RoleKind>('student')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [offer, setOffer] = useState<RoleSuggestion | null>(null)

  const load = () => {
    api.get<Affiliation[]>('/affiliations/me').then(setRows).catch(() => {})
    if (me?.is_verified) {
      api
        .get<RoleSuggestion | null>('/affiliations/suggestion')
        .then((s) => setOffer(s && !wasDismissed(s.org_name) ? s : null))
        .catch(() => setOffer(null))
    }
  }
  useEffect(() => {
    load()
  }, [me?.is_verified])

  const accept = async (k: RoleKind) => {
    try {
      const row = await api.post<Affiliation>('/affiliations/from-account', { kind: k })
      setMsg({ ok: true, text: `Done. You're verified as ${ROLE_LABEL[row.kind].toLowerCase()} at ${row.org_name}.` })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not add this role' })
    }
  }

  const dismiss = () => {
    if (!offer) return
    try {
      localStorage.setItem(dismissKey(offer.org_name), '1')
    } catch {
      // Private mode: the offer just comes back next visit.
    }
    setOffer(null)
  }

  const graduate = async (a: Affiliation) => {
    if (!window.confirm(`Mark yourself as graduated from ${a.org_name}? Your badge changes to Alumni and stays verified.`)) return
    try {
      await api.post(`/affiliations/${a.id}/graduate`)
      setMsg({ ok: true, text: `Congratulations! You're now verified alumni of ${a.org_name}.` })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not update this role' })
    }
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const row = await api.post<Affiliation>('/affiliations', {
        kind,
        email,
        org_name: orgName.trim() || undefined,
      })
      setMsg({ ok: true, text: `We sent a link to ${row.email}. Open it to confirm.` })
      setEmail('')
      setOrgName('')
      setOpen(false)
      load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not add this role' })
    }
  }

  const resend = async (a: Affiliation) => {
    try {
      await api.post(`/affiliations/${a.id}/resend`)
      setMsg({ ok: true, text: `Sent a fresh link to ${a.email}.` })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not resend' })
    }
  }

  const remove = async (a: Affiliation) => {
    if (!window.confirm(`Remove ${ROLE_LABEL[a.kind].toLowerCase()} at ${a.org_name}?`)) return
    await api.del(`/affiliations/${a.id}`)
    load()
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-navy">Verified roles</h3>
        {!open && me?.is_verified && (
          <button onClick={() => setOpen(true)} className="btn-ghost">
            Add a role
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink">
        A verified badge shows members, employers and schools that you really study, teach or hire
        where you say. We confirm it with your school or work email, which stays private.
      </p>

      {!me?.is_verified && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Verify your account email first, then you can add a role.
        </p>
      )}

      {offer && (
        <div className="mt-4 rounded-xl border border-green/30 bg-green/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-navy">
            <FiZap className="h-4 w-4 text-green-deep" />
            You signed up with your {offer.org_type === 'industry' ? 'work' : 'school'} email at {offer.org_name}.
          </p>
          <p className="mt-1 text-sm text-ink">Add a verified role now. No second email needed.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.kinds.map((k) => (
              <button key={k} onClick={() => accept(k)} className="btn-green text-sm">
                {SUGGEST_LABEL[k]}
              </button>
            ))}
            <button onClick={dismiss} className="btn-ghost text-sm">
              Not now
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-4 rounded-lg px-4 py-3 text-sm ${msg.ok ? 'bg-green/10 text-green-deep' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </p>
      )}

      {open && (
        <form onSubmit={add} className="mt-4 space-y-3 rounded-xl border border-navy/10 p-4">
          <div>
            <label className="label">I am</label>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as RoleKind)}>
              <option value="student">A student</option>
              <option value="alumni">A graduate (alumni)</option>
              <option value="faculty">Faculty (professor, lecturer, researcher)</option>
              <option value="recruiter">Hiring (employer, HR, recruiter)</option>
            </select>
          </div>
          <div>
            <label className="label">{kind === 'recruiter' ? 'Work email' : 'School email'}</label>
            <input
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={kind === 'recruiter' ? 'you@company.com' : 'you@university.edu'}
            />
            <p className="mt-1 text-xs text-ink">{KIND_HELP[kind]} Personal addresses like Gmail can't be used.</p>
          </div>
          <div>
            <label className="label">{kind === 'recruiter' ? 'Company name' : 'School or university name'}</label>
            <input
              className="field"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Only needed if we don't know your email domain yet"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-green">
              Send confirmation link
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-navy/5">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium text-navy">
                  {ROLE_LABEL[a.kind]} · {a.org_name}
                </p>
                <p className="text-xs text-ink">{a.email} (only you and our team see this)</p>
                <div className="mt-1">
                  <Status a={a} />
                </div>
              </div>
              <div className="flex gap-1">
                {a.kind === 'student' && a.status === 'verified' && (
                  <button onClick={() => graduate(a)} className="btn-ghost inline-flex items-center gap-1 text-sm">
                    <FiAward className="h-4 w-4" />
                    I've graduated
                  </button>
                )}
                {a.status === 'email_sent' && (
                  <button onClick={() => resend(a)} className="btn-ghost text-sm">
                    Resend link
                  </button>
                )}
                <button
                  onClick={() => remove(a)}
                  title="Remove"
                  className="grid h-9 w-9 place-items-center rounded-lg text-navy/50 hover:bg-red-50 hover:text-red-600"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
