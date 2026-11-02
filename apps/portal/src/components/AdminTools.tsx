import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { FiImage, FiTrash2 } from 'react-icons/fi'
import { ApiError, api, fileUrl } from '../lib/api'
import type { MemberMini } from '../lib/types'
import Avatar from './Avatar'

const AUDIENCES = [
  ['all', 'All members'],
  ['student', 'Students'],
  ['seeker', 'Job seekers'],
  ['mentor', 'Mentors'],
  ['employer', 'People who hire'],
  ['campus', 'University staff'],
] as const

type PromoAdmin = {
  id: string
  sponsor: string
  title: string
  body: string
  image_url?: string | null
  link_url: string
  cta: string
  placement: 'rail' | 'feed'
  audience: string
  active: boolean
  impressions: number
  clicks: number
}

const EMPTY = { sponsor: '', title: '', body: '', link_url: '', cta: 'Learn more', placement: 'rail', audience: 'all', active: true }

function Msg({ text }: { text: string }) {
  return text ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{text}</p> : null
}

// Sponsored cards: create, pause, add an image, see views and clicks.
export function PromotionsAdmin() {
  const [rows, setRows] = useState<PromoAdmin[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState('')
  const imageFor = useRef<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const load = useCallback(() => api.get<PromoAdmin[]>('/admin/promotions').then(setRows).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/promotions', form)
      setForm({ ...EMPTY })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    }
  }
  const toggle = async (p: PromoAdmin) => {
    const { id, impressions, clicks, image_url, ...rest } = p
    void impressions; void clicks; void image_url
    await api.patch(`/admin/promotions/${id}`, { ...rest, active: !p.active })
    load()
  }
  const remove = async (p: PromoAdmin) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    await api.del(`/admin/promotions/${p.id}`)
    load()
  }
  const image = async (file?: File) => {
    if (!file || !imageFor.current) return
    try {
      await api.upload(`/admin/promotions/${imageFor.current}/image`, file)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    }
  }
  const field = (k: keyof typeof EMPTY, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
    </div>
  )

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink">
        Sponsored cards are always labeled Sponsored, targeted by role only, and sponsors see totals, never who.
      </p>
      <form onSubmit={create} className="card grid gap-3 sm:grid-cols-2">
        {field('sponsor', 'Sponsor', { required: true, maxLength: 120 })}
        {field('title', 'Headline', { required: true, maxLength: 160 })}
        <div className="sm:col-span-2">
          <label className="label">Text</label>
          <textarea className="field" required maxLength={400} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        {field('link_url', 'Link (https://…)', { required: true, type: 'url' })}
        {field('cta', 'Button text', { maxLength: 40 })}
        <div>
          <label className="label">Where</label>
          <select className="field" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
            <option value="rail">Right column on home</option>
            <option value="feed">Between feed posts</option>
          </select>
        </div>
        <div>
          <label className="label">Shown to</label>
          <select className="field" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {AUDIENCES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Msg text={error} />
          <button className="btn-green">Add sponsored card</button>
        </div>
      </form>
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { image(e.target.files?.[0]); e.target.value = '' }} />
      <ul className="space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center gap-4">
            {p.image_url ? <img src={fileUrl(p.image_url) ?? ''} alt="" className="h-14 w-24 rounded object-cover" /> : <span className="grid h-14 w-24 place-items-center rounded bg-navy-50 text-xs text-ink">No image</span>}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{p.title} <span className="text-xs font-normal text-ink">· {p.sponsor}</span></p>
              <p className="text-xs text-ink">
                {p.placement === 'rail' ? 'Right column' : 'Feed'} · {AUDIENCES.find(([v]) => v === p.audience)?.[1]} · <b>{p.impressions}</b> views · <b>{p.clicks}</b> clicks
                {p.impressions > 0 && ` (${((p.clicks / p.impressions) * 100).toFixed(1)}%)`}
              </p>
            </div>
            <button onClick={() => { imageFor.current = p.id; picker.current?.click() }} className="btn-ghost gap-2 px-3 py-1.5 text-sm"><FiImage className="h-4 w-4" /> Image</button>
            <button onClick={() => toggle(p)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${p.active ? 'bg-green/10 text-green-deep' : 'bg-navy-50 text-ink'}`}>
              {p.active ? 'Live' : 'Paused'}
            </button>
            <button onClick={() => remove(p)} aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-full text-navy/40 hover:bg-red-50 hover:text-red-600"><FiTrash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-ink">No sponsored cards yet.</li>}
      </ul>
    </div>
  )
}

type Update = { id: string; title: string; body?: string | null; link?: string | null; published: boolean; created_at: string }

// "Great Skills updates" on everyone's home page.
export function UpdatesAdmin() {
  const [rows, setRows] = useState<Update[]>([])
  const [form, setForm] = useState({ title: '', body: '', link: '' })
  const [error, setError] = useState('')
  const load = useCallback(() => api.get<Update[]>('/admin/updates').then(setRows).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])
  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/updates', { title: form.title, body: form.body || null, link: form.link || null })
      setForm({ title: '', body: '', link: '' })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card space-y-3">
        <div>
          <label className="label">Headline</label>
          <input className="field" required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Spring cohort applications open Monday" />
        </div>
        <div>
          <label className="label">One or two lines (optional)</label>
          <input className="field" maxLength={400} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div>
          <label className="label">Link (optional)</label>
          <input className="field" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://greatskills.org/…" />
        </div>
        <Msg text={error} />
        <button className="btn-green">Publish update</button>
      </form>
      <ul className="divide-y divide-navy/5 rounded-xl border border-navy/10 bg-white">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{u.title}</p>
              <p className="text-xs text-ink">{new Date(u.created_at).toLocaleDateString()}{u.body ? ` · ${u.body}` : ''}</p>
            </div>
            <button onClick={async () => { await api.del(`/admin/updates/${u.id}`); load() }} aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-full text-navy/40 hover:bg-red-50 hover:text-red-600"><FiTrash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-4 text-sm text-ink">No updates yet.</li>}
      </ul>
    </div>
  )
}

type Person = { person: MemberMini; email: string; is_plus: boolean; requested_at?: string | null }

// Achievers Plus requests and members.
export function PlusAdmin() {
  const [rows, setRows] = useState<Person[]>([])
  const load = useCallback(() => api.get<Person[]>('/admin/plus').then(setRows).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])
  const set = async (p: Person, on: boolean) => {
    await api.post(`/admin/plus/${p.person.user_id}?on=${on}`)
    load()
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">There's no billing yet: members ask for Plus, and you switch it on here.</p>
      <ul className="divide-y divide-navy/5 rounded-xl border border-navy/10 bg-white">
        {rows.map((p) => (
          <li key={p.person.user_id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={p.person.full_name} url={p.person.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{p.person.full_name}</p>
              <p className="text-xs text-ink">{p.email}{p.requested_at ? ` · asked ${new Date(p.requested_at).toLocaleDateString()}` : ''}</p>
            </div>
            {p.is_plus ? (
              <button onClick={() => set(p, false)} className="rounded-full border border-navy/30 px-4 py-1.5 text-sm font-semibold text-navy">Switch off</button>
            ) : (
              <button onClick={() => set(p, true)} className="btn-green px-4 py-1.5 text-sm">Switch on Plus</button>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-4 text-sm text-ink">No requests yet.</li>}
      </ul>
    </div>
  )
}

// The approved list of members who may upload video files.
export function VideoCreatorsAdmin() {
  const [rows, setRows] = useState<Person[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => api.get<Person[]>('/admin/video-creators').then(setRows).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])
  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/video-creators', { email })
      setEmail('')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add')
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink">
        Members on this list can upload video files (up to 3 minutes, 200 MB, 5 a day). Everyone else shares YouTube or Vimeo links.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input className="field flex-1" type="email" required placeholder="Member's sign-in email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-green">Add</button>
      </form>
      <Msg text={error} />
      <ul className="divide-y divide-navy/5 rounded-xl border border-navy/10 bg-white">
        {rows.map((p) => (
          <li key={p.person.user_id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={p.person.full_name} url={p.person.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{p.person.full_name}</p>
              <p className="text-xs text-ink">{p.email}</p>
            </div>
            <button onClick={async () => { await api.del(`/admin/video-creators/${p.person.user_id}`); load() }} className="rounded-full border border-navy/30 px-4 py-1.5 text-sm font-semibold text-navy">Remove</button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-4 text-sm text-ink">Nobody yet.</li>}
      </ul>
    </div>
  )
}
