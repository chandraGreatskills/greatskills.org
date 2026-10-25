import { useState } from 'react'
import { ApiError, api } from '../lib/api'
import { dateInput, endOfDay } from '../lib/format'
import type { Opportunity } from '../lib/types'

const KINDS = [
  { value: 'employment', label: 'Job' },
  { value: 'internship', label: 'Internship' },
  { value: 'research', label: 'Research' },
  { value: 'academic', label: 'Academic' },
  { value: 'fellowship', label: 'Fellowship' },
]

// Post a new opening, or edit one the member posted.
export default function OpportunityForm({
  existing,
  onDone,
  onCancel,
}: {
  existing?: Opportunity
  onDone: (o: Opportunity) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    kind: existing?.kind ?? 'internship',
    location: existing?.location ?? '',
    remote: existing?.remote ?? false,
    pay: existing?.pay ?? '',
    eligibility: existing?.eligibility ?? '',
    closes: dateInput(existing?.closes_at),
    skills: (existing?.skills_wanted ?? []).join(', '),
    description: existing?.description ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const today = dateInput(new Date().toISOString())

  const submit = async () => {
    if (form.title.trim().length < 3) return setError('Add a title of at least 3 characters.')
    const body = {
      title: form.title.trim(),
      kind: form.kind,
      location: form.location.trim() || null,
      remote: form.remote,
      pay: form.pay.trim() || null,
      eligibility: form.eligibility.trim() || null,
      closes_at: endOfDay(form.closes),
      skills_wanted: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim() || null,
    }
    setBusy(true)
    try {
      const saved = existing
        ? await api.patch<Opportunity>(`/opportunities/${existing.id}`, body)
        : await api.post<Opportunity>('/opportunities', body)
      onDone(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-serif text-lg font-semibold text-navy sm:col-span-2">
        {existing ? 'Edit opening' : 'Post an opening'}
      </h2>
      <Field label="Title" wide>
        <input className="field" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Data Analyst Intern" />
      </Field>
      <Field label="Type">
        <select className="field" value={form.kind} onChange={(e) => set({ kind: e.target.value })}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Applications close">
        <input type="date" min={today} className="field" value={form.closes} onChange={(e) => set({ closes: e.target.value })} />
      </Field>
      <Field label="Location">
        <input className="field" value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="City, State" />
      </Field>
      <Field label="Pay or stipend">
        <input className="field" value={form.pay} onChange={(e) => set({ pay: e.target.value })} placeholder="e.g. Rs 15,000 a month, or Unpaid" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-navy sm:col-span-2">
        <input type="checkbox" checked={form.remote} onChange={(e) => set({ remote: e.target.checked })} />
        Can be done remotely
      </label>
      <Field label="Who can apply" wide>
        <input className="field" value={form.eligibility} onChange={(e) => set({ eligibility: e.target.value })} placeholder="e.g. Final-year B.Tech, CSE or ECE" />
      </Field>
      <Field label="Skills wanted (comma separated)" wide>
        <input className="field" value={form.skills} onChange={(e) => set({ skills: e.target.value })} placeholder="Python, SQL, Excel" />
      </Field>
      <Field label="Description" wide>
        <textarea className="field min-h-[120px]" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button onClick={submit} disabled={busy} className="btn-green flex-1">
          {existing ? 'Save changes' : 'Post opening'}
        </button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
