import { useEffect, useRef, useState } from 'react'
import { FiUpload, FiFileText, FiPlus, FiTrash2, FiCheck } from 'react-icons/fi'
import { api, fileUrl, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Profile as ProfileT } from '../lib/types'
import SecurityCard from '../components/SecurityCard'

export default function Profile() {
  const { refreshMe } = useAuth()
  const [profile, setProfile] = useState<ProfileT | null>(null)
  const [saved, setSaved] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const resumeInput = useRef<HTMLInputElement>(null)

  const load = () => api.get<ProfileT>('/profiles/me').then(setProfile)
  useEffect(() => {
    load()
  }, [])

  if (!profile) return <p className="text-navy/50">Loading profile…</p>

  const update = (patch: Partial<ProfileT>) =>
    setProfile((p) => (p ? { ...p, ...patch } : p))

  const save = async () => {
    const updated = await api.patch<ProfileT>('/profiles/me', {
      full_name: profile.full_name,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      industry: profile.industry,
      skills: profile.skills,
      interests: profile.interests,
      open_to_work: profile.open_to_work,
      open_to_mentor: profile.open_to_mentor,
    })
    setProfile(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    refreshMe()
  }

  // The API checks file contents, so tell the member why a file was refused.
  const explain = (err: unknown) =>
    window.alert(err instanceof ApiError ? err.message : 'Upload failed')

  const uploadAvatar = async (file: File) => {
    try {
      const updated = await api.upload<ProfileT>('/profiles/me/avatar', file)
      setProfile(updated)
      refreshMe()
    } catch (err) {
      explain(err)
    }
  }
  const uploadResume = async (file: File) => {
    try {
      await api.upload('/profiles/me/resume', file)
      load()
    } catch (err) {
      explain(err)
    }
  }
  const removeResume = async (id: string, filename: string) => {
    if (!window.confirm(`Delete ${filename}? This removes the file for good.`)) return
    await api.del(`/profiles/me/resumes/${id}`)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left: identity card */}
      <aside className="space-y-6">
        <div className="card text-center">
          <div className="relative mx-auto h-28 w-28">
            {profile.avatar_url ? (
              <img
                src={fileUrl(profile.avatar_url) ?? ''}
                alt=""
                className="h-28 w-28 rounded-full object-cover ring-4 ring-green/15"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-full bg-navy-50 font-serif text-3xl font-bold text-navy">
                {profile.full_name[0]}
              </div>
            )}
            <button
              onClick={() => avatarInput.current?.click()}
              className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-green-shine text-white shadow-soft"
              title="Change photo"
            >
              <FiUpload className="h-4 w-4" />
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-navy">
            {profile.full_name}
          </h2>
          <p className="text-sm text-ink">{profile.headline || 'Add a headline'}</p>
          <span className="mt-2 inline-block text-xs text-green-deep">
            /in/{profile.handle}
          </span>
          <div className="mt-4 flex flex-col gap-2">
            <Toggle
              label="Open to work"
              on={profile.open_to_work}
              onChange={(v) => update({ open_to_work: v })}
            />
            <Toggle
              label="Open to mentor"
              on={profile.open_to_mentor}
              onChange={(v) => update({ open_to_mentor: v })}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-semibold text-navy">Resumes</h3>
          {profile.resumes.length === 0 && (
            <p className="text-sm text-ink">No resume uploaded yet.</p>
          )}
          <ul className="space-y-2">
            {profile.resumes.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm text-navy">
                <FiFileText className="h-4 w-4 text-green-deep" />
                <button
                  onClick={() => api.download(`/profiles/me/resumes/${r.id}/file`, r.filename)}
                  className="truncate text-left hover:underline"
                >
                  {r.filename}
                </button>
                {r.is_primary && (
                  <span className="rounded bg-green/10 px-1.5 text-xs text-green-deep">
                    primary
                  </span>
                )}
                <button
                  onClick={() => removeResume(r.id, r.filename)}
                  className="ml-auto text-xs text-ink hover:text-red-600"
                  aria-label={`Delete ${r.filename}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => resumeInput.current?.click()}
            className="btn-ghost mt-4 w-full"
          >
            <FiUpload className="h-4 w-4" /> Upload resume
          </button>
          <input
            ref={resumeInput}
            type="file"
            accept=".pdf,.docx"
            hidden
            onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])}
          />
        </div>

        <SecurityCard />
      </aside>

      {/* Right: editable details */}
      <section className="space-y-6">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-navy">Edit profile</h3>
            <button onClick={save} className="btn-green">
              {saved ? (
                <>
                  <FiCheck className="h-4 w-4" /> Saved
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
          <Grid>
            <Text label="Full name" value={profile.full_name} onChange={(v) => update({ full_name: v })} />
            <Text label="Headline" value={profile.headline ?? ''} onChange={(v) => update({ headline: v })} />
            <Text label="Location" value={profile.location ?? ''} onChange={(v) => update({ location: v })} />
            <Text label="Industry" value={profile.industry ?? ''} onChange={(v) => update({ industry: v })} />
          </Grid>
          <div>
            <label className="label">About</label>
            <textarea
              className="field min-h-[110px]"
              value={profile.bio ?? ''}
              onChange={(e) => update({ bio: e.target.value })}
              placeholder="Tell the community about yourself…"
            />
          </div>
          <Tags label="Skills" values={profile.skills} onChange={(v) => update({ skills: v })} />
          <Tags label="Interests" values={profile.interests} onChange={(v) => update({ interests: v })} />
        </div>

        <ExperienceEditor profile={profile} reload={load} />
      </section>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
        on ? 'bg-green/10 text-green-deep' : 'bg-navy-50 text-navy/60'
      }`}
    >
      {label}
      <span
        className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-green' : 'bg-navy/20'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function Tags({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-sm text-navy"
          >
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))}>
              <FiTrash2 className="h-3 w-3 text-navy/40 hover:text-red-500" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 rounded-full border border-dashed border-navy/20 px-3 py-1 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type and press Enter"
        />
      </div>
    </div>
  )
}

function ExperienceEditor({ profile, reload }: { profile: ProfileT; reload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', company: '', start_year: '', end_year: '' })

  const submit = async () => {
    await api.post('/profiles/me/experiences', {
      title: form.title,
      company: form.company,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
    })
    setForm({ title: '', company: '', start_year: '', end_year: '' })
    setAdding(false)
    reload()
  }
  const remove = async (id: string) => {
    await api.del(`/profiles/me/experiences/${id}`)
    reload()
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-navy">Experience</h3>
        <button onClick={() => setAdding((v) => !v)} className="btn-ghost">
          <FiPlus className="h-4 w-4" /> Add
        </button>
      </div>

      {adding && (
        <div className="mt-4 grid gap-3 rounded-xl bg-navy-50 p-4 sm:grid-cols-2">
          <input className="field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="field" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input className="field" placeholder="Start year" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
          <input className="field" placeholder="End year" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
          <button onClick={submit} className="btn-green sm:col-span-2">
            Save experience
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {profile.experiences.length === 0 && !adding && (
          <p className="text-sm text-ink">No experience added yet.</p>
        )}
        {profile.experiences.map((exp) => (
          <li key={exp.id} className="flex items-start justify-between border-b border-navy/5 pb-3">
            <div>
              <p className="font-semibold text-navy">{exp.title}</p>
              <p className="text-sm text-ink">
                {exp.company}
                {exp.start_year && ` · ${exp.start_year}–${exp.end_year || 'Present'}`}
              </p>
            </div>
            <button onClick={() => remove(exp.id)} className="text-navy/30 hover:text-red-500">
              <FiTrash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
