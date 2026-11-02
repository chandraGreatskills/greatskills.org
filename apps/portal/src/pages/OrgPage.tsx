import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiBriefcase, FiCheck, FiEdit2, FiExternalLink, FiMapPin, FiPlus, FiUpload, FiUsers } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { kindLabel, timeAgo } from '../lib/format'
import { ROLE_LABEL } from '../lib/roles'
import type { OrgPage as Org } from '../lib/types'
import Avatar from '../components/Avatar'
import DemoBadge from '../components/DemoBadge'
import OrgLogo from '../components/OrgLogo'

type Tab = 'about' | 'openings' | 'people'

const COVER: Record<string, string> = {
  academia: 'linear-gradient(100deg, #012652 0%, #0e4f7a 55%, #1f6b3a 100%)',
  industry: 'linear-gradient(100deg, #0f172a 0%, #012652 55%, #0e7490 100%)',
}

// A university's or company's page: who they are, what's open, who's here.
export default function OrgPage() {
  const { slug } = useParams()
  const { me } = useAuth()
  const [org, setOrg] = useState<Org | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('about')
  const [editing, setEditing] = useState(false)

  const load = useCallback(
    () =>
      api
        .get<Org>(`/orgs/${slug}`)
        .then(setOrg)
        .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'This organization is not on Great Skills yet.' : 'Could not load this page.')),
    [slug],
  )
  useEffect(() => {
    load()
  }, [load])

  if (error) return <p className="text-sm text-ink">{error}</p>
  if (!org) return <p className="text-navy/50">Loading…</p>

  const school = org.org_type === 'academia'
  const toggleFollow = async () => {
    await (org.following ? api.del(`/orgs/${org.slug}/follow`) : api.put(`/orgs/${org.slug}/follow`, {}))
    load()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
        <div className="h-28 sm:h-36" style={{ background: COVER[org.org_type] ?? COVER.industry }} />
        <div className="px-6 pb-5">
          <div className="-mt-12 flex items-end justify-between">
            <div className="rounded-xl bg-white p-1.5 shadow-sm">
              <OrgLogo name={org.name} url={org.logo_url} size="h-24 w-24 text-2xl" />
            </div>
          </div>
          <h1 className="mt-3 flex flex-wrap items-center gap-2 text-2xl font-semibold text-navy">
            {org.name} <DemoBadge show={org.is_demo} />
          </h1>
          {org.tagline && <p className="mt-1 text-base text-navy">{org.tagline}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
            <span>{school ? 'University' : 'Company'}</span>
            {org.location && (
              <span className="flex items-center gap-1">
                <FiMapPin className="h-3.5 w-3.5" /> {org.location}
              </span>
            )}
            <span>
              {org.followers} follower{org.followers === 1 ? '' : 's'}
            </span>
            <span>
              {school ? `${org.student_count} verified students · ${org.staff_count} faculty and staff` : `${org.staff_count} verified people hiring`}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {me && (
              <button
                onClick={toggleFollow}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-semibold ${
                  org.following ? 'border border-navy/30 text-navy hover:bg-navy-50' : 'bg-navy text-white hover:bg-navy-900'
                }`}
              >
                {org.following ? <FiCheck className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />} {org.following ? 'Following' : 'Follow'}
              </button>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-full border border-navy/30 px-4 py-1.5 text-sm font-semibold text-navy hover:bg-navy-50">
                Visit website <FiExternalLink className="h-4 w-4" />
              </a>
            )}
            {org.can_edit && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-full border border-green-deep/60 px-4 py-1.5 text-sm font-semibold text-green-deep hover:bg-green/10">
                <FiEdit2 className="h-4 w-4" /> Edit page
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 border-t border-navy/5 px-4">
          {(['about', 'openings', 'people'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold ${tab === t ? 'border-green-deep text-green-deep' : 'border-transparent text-navy/60 hover:text-navy'}`}
            >
              {t === 'about' ? 'About' : t === 'openings' ? `Openings (${org.openings.length})` : 'People'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'about' && (
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-5">
          <h2 className="mb-2 text-xl font-semibold text-navy">About</h2>
          {org.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-navy">{org.description}</p>
          ) : (
            <p className="text-sm text-ink">{org.can_edit ? 'Add a short description so students and partners know who you are.' : 'No description yet.'}</p>
          )}
        </div>
      )}

      {tab === 'openings' && (
        <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
          <ul className="divide-y divide-navy/5">
            {org.openings.map((o) => (
              <li key={o.id}>
                <Link to={`/opportunities/${o.id}`} className="flex items-start gap-3 px-6 py-4 hover:bg-navy-50/60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy">
                    <FiBriefcase className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy">{o.title}</span>
                    <span className="block text-sm text-ink">
                      {kindLabel(o.kind)} · {o.remote ? 'Remote' : o.location || 'On-site'} · posted {timeAgo(o.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {org.openings.length === 0 && <li className="px-6 py-5 text-sm text-ink">No open roles right now.</li>}
          </ul>
        </div>
      )}

      {tab === 'people' && (
        <div className="rounded-xl border border-navy/10 bg-white px-6 py-5">
          {!me ? (
            <p className="text-sm text-ink">Sign in to see who's here.</p>
          ) : org.people.length === 0 ? (
            <p className="text-sm text-ink">No verified members yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {org.people.map(({ person, kind }) => (
                <li key={person.user_id}>
                  <Link to={`/in/${person.handle}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-navy-50">
                    <Avatar name={person.full_name} url={person.avatar_url} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{person.full_name}</span>
                      <span className="block truncate text-xs text-ink">
                        <FiUsers className="mr-1 inline h-3 w-3" />
                        {ROLE_LABEL[kind]}
                        {person.headline ? ` · ${person.headline}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && <EditDialog org={org} onClose={() => setEditing(false)} onSaved={load} />}
    </div>
  )
}

function EditDialog({ org, onClose, onSaved }: { org: Org; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    tagline: org.tagline ?? '',
    description: org.description ?? '',
    location: org.location ?? '',
    website: org.website ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.patch(`/orgs/${org.slug}`, { ...form, website: form.website.trim() || null })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  const uploadLogo = async (file: File) => {
    try {
      await api.upload(`/orgs/${org.slug}/logo`, file)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-6 shadow-card" role="dialog">
        <h3 className="text-lg font-semibold text-navy">Edit {org.name}</h3>
        <div className="flex items-center gap-3">
          <OrgLogo name={org.name} url={org.logo_url} />
          <button type="button" onClick={() => logoInput.current?.click()} className="btn-ghost inline-flex items-center gap-2">
            <FiUpload className="h-4 w-4" /> Upload logo
          </button>
          <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
        </div>
        <label className="label">Tagline</label>
        <input className="field" maxLength={200} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One line about who you are" />
        <label className="label">About</label>
        <textarea className="field min-h-[120px]" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Location</label>
            <input className="field" maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-green">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
