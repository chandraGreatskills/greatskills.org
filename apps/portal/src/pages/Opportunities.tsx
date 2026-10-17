import { useEffect, useState } from 'react'
import { FiBriefcase, FiMapPin, FiPlus, FiCheck } from 'react-icons/fi'
import { api, ApiError } from '../lib/api'
import type { Opportunity } from '../lib/types'

const kinds = [
  { value: '', label: 'All' },
  { value: 'employment', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'research', label: 'Research' },
  { value: 'academic', label: 'Academic' },
]

export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [kind, setKind] = useState('')
  const [applied, setApplied] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    setItems(await api.get<Opportunity[]>(`/opportunities?${params}`))
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const apply = async (o: Opportunity) => {
    try {
      await api.post(`/opportunities/${o.id}/apply`, {})
      setApplied((s) => ({ ...s, [o.id]: 'Applied' }))
    } catch (err) {
      setApplied((s) => ({ ...s, [o.id]: err instanceof ApiError ? err.message : 'Error' }))
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy">Opportunities</h1>
          <p className="text-sm text-ink">Jobs, internships, research, and academic openings.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-green">
          <FiPlus className="h-4 w-4" /> Post
        </button>
      </div>

      {showForm && <PostForm onDone={() => { setShowForm(false); load() }} />}

      <div className="mb-6 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k.value}
            onClick={() => setKind(k.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              kind === k.value ? 'bg-green-shine text-white' : 'bg-white text-navy/70'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {items.map((o) => (
          <div key={o.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-green-deep">
                <FiBriefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-navy">{o.title}</p>
                <p className="flex items-center gap-2 text-sm text-ink">
                  <span className="rounded bg-green/10 px-2 py-0.5 text-xs font-medium text-green-deep">
                    {o.kind}
                  </span>
                  {o.remote ? 'Remote' : o.location || 'On-site'}
                  {o.location && !o.remote && (
                    <span className="flex items-center gap-1">
                      <FiMapPin className="h-3 w-3" /> {o.location}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => apply(o)} disabled={!!applied[o.id]} className="btn-ghost shrink-0">
              {applied[o.id] ? <><FiCheck className="h-4 w-4" /> {applied[o.id]}</> : 'Apply'}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink">No opportunities yet. Be the first to post one.</p>}
      </div>
    </div>
  )
}

function PostForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ title: '', kind: 'employment', location: '', remote: false, description: '' })
  const submit = async () => {
    if (!form.title) return
    await api.post('/opportunities', form)
    onDone()
  }
  return (
    <div className="card mb-6 grid gap-3 sm:grid-cols-2">
      <input className="field sm:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
        {kinds.filter((k) => k.value).map((k) => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>
      <input className="field" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} />
        Remote
      </label>
      <textarea className="field sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button onClick={submit} className="btn-green sm:col-span-2">Post opportunity</button>
    </div>
  )
}
