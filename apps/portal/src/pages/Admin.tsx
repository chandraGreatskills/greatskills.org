import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ROLE_LABEL } from '../lib/roles'
import type { AdminAffiliation, OrgReview } from '../lib/types'

type Tab = 'pending' | 'approved' | 'rejected'

const TYPE_LABEL: Record<string, string> = { academia: 'School / university', industry: 'Company' }
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Members({ org }: { org: OrgReview }) {
  const [rows, setRows] = useState<AdminAffiliation[] | null>(null)
  const load = useCallback(
    () => api.get<AdminAffiliation[]>(`/admin/organizations/${org.id}/affiliations`).then(setRows),
    [org.id],
  )
  useEffect(() => {
    load()
  }, [load])

  const revoke = async (a: AdminAffiliation) => {
    if (!window.confirm(`Withdraw ${a.member_name}'s verified ${ROLE_LABEL[a.kind].toLowerCase()} role?`)) return
    await api.post(`/admin/affiliations/${a.id}/revoke`)
    load()
  }

  if (!rows) return <p className="text-sm text-ink">Loading…</p>
  if (rows.length === 0) return <p className="text-sm text-ink">No one has claimed a role here yet.</p>
  return (
    <ul className="divide-y divide-navy/5 text-sm">
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div>
            <p className="font-medium text-navy">
              {a.member_name} · {ROLE_LABEL[a.kind]}
            </p>
            <p className="text-xs text-ink">
              {a.email} · {a.status.replace('_', ' ')} · {when(a.created_at)}
            </p>
          </div>
          {a.status === 'verified' && (
            <button onClick={() => revoke(a)} className="btn-ghost text-sm text-red-600">
              Withdraw
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function Admin() {
  const { me } = useAuth()
  const [tab, setTab] = useState<Tab>('pending')
  const [orgs, setOrgs] = useState<OrgReview[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isAdmin = me?.role === 'admin'
  const load = useCallback(
    () =>
      api
        .get<OrgReview[]>(`/admin/organizations?status=${tab}`)
        .then((r) => {
          setOrgs(r)
          setError('')
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load')),
    [tab],
  )

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (me && me.role !== 'admin') return <Navigate to="/" replace />

  const decide = async (org: OrgReview, action: 'approve' | 'reject') => {
    const verb = action === 'approve' ? 'Approve' : 'Reject'
    const effect =
      action === 'approve'
        ? `${org.waiting} waiting member(s) will get a verified badge.`
        : 'Nobody will be verified here, and existing badges are removed.'
    if (!window.confirm(`${verb} ${org.name}? ${effect}`)) return
    await api.post(`/admin/organizations/${org.id}/${action}`)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-navy">Organization review</h1>
        <p className="mt-1 text-sm text-ink">
          New schools and companies appear here when a member first verifies an email on their
          domain. Check the name matches the domain before approving, for example by visiting the
          domain's website.
        </p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-navy/10'}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!error && orgs.length === 0 && (
        <p className="card text-sm text-ink">{tab === 'pending' ? 'Nothing waiting. All caught up.' : `No ${tab} organizations.`}</p>
      )}

      <div className="space-y-4">
        {orgs.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy">{o.name}</p>
                <p className="text-sm text-ink">
                  {TYPE_LABEL[o.org_type] ?? o.org_type} · {o.domains.join(', ') || 'no domain'} · added {when(o.created_at)}
                  {o.requested_by ? ` by ${o.requested_by}` : ''}
                </p>
                {o.waiting > 0 && (
                  <p className="mt-1 text-sm font-medium text-amber-700">{o.waiting} member(s) waiting on this decision</p>
                )}
              </div>
              <div className="flex gap-2">
                {o.status !== 'approved' && (
                  <button onClick={() => decide(o, 'approve')} className="btn-green">
                    Approve
                  </button>
                )}
                {o.status !== 'rejected' && (
                  <button onClick={() => decide(o, 'reject')} className="btn-ghost text-red-600">
                    Reject
                  </button>
                )}
                <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="btn-ghost">
                  {openId === o.id ? 'Hide members' : 'Members'}
                </button>
              </div>
            </div>
            {openId === o.id && (
              <div className="mt-4 border-t border-navy/5 pt-3">
                <Members org={o} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
