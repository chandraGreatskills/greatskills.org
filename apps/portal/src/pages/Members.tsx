import { useEffect, useState } from 'react'
import { FiSearch, FiUserPlus, FiMapPin } from 'react-icons/fi'
import { api, fileUrl, ApiError } from '../lib/api'
import type { ProfileCard } from '../lib/types'

const filters = [
  { value: '', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'academia', label: 'Academia' },
  { value: 'industry', label: 'Industry' },
  { value: 'mentor', label: 'Mentors' },
]

export default function Members() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [members, setMembers] = useState<ProfileCard[]>([])
  const [notice, setNotice] = useState('')
  const [sent, setSent] = useState<Record<string, string>>({})

  const search = async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('member_type', type)
    try {
      setMembers(await api.get<ProfileCard[]>(`/members?${params}`))
      setNotice('')
    } catch (err) {
      setMembers([])
      setNotice(err instanceof ApiError ? err.message : 'Could not load members')
    }
  }
  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const connect = async (m: ProfileCard) => {
    try {
      await api.post('/connections', { addressee_id: m.user_id })
      setSent((s) => ({ ...s, [m.id]: 'Request sent' }))
    } catch (err) {
      setSent((s) => ({
        ...s,
        [m.id]: err instanceof ApiError ? err.message : 'Error',
      }))
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-navy">Your Network</h1>
        <p className="text-sm text-ink">
          Find members, mentors, industry, and academia to connect with.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" />
          <input
            className="field pl-11"
            placeholder="Search by name, headline, industry…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <button onClick={search} className="btn-navy">
          Search
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              type === f.value ? 'bg-green-shine text-white' : 'bg-white text-navy/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div key={m.id} className="card flex flex-col">
            <div className="flex items-center gap-3">
              {m.avatar_url ? (
                <img
                  src={fileUrl(m.avatar_url) ?? ''}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-green/15"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-navy-50 font-serif text-lg font-bold text-navy">
                  {m.full_name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy">{m.full_name}</p>
                <p className="truncate text-sm text-ink">{m.headline || m.member_type}</p>
              </div>
            </div>
            {m.location && (
              <p className="mt-3 flex items-center gap-1 text-xs text-ink">
                <FiMapPin className="h-3 w-3" /> {m.location}
              </p>
            )}
            <button
              onClick={() => connect(m)}
              disabled={!!sent[m.id]}
              className="btn-ghost mt-4 w-full"
            >
              <FiUserPlus className="h-4 w-4" /> {sent[m.id] || 'Connect'}
            </button>
          </div>
        ))}
        {notice && <p className="text-sm text-ink">{notice}</p>}
        {!notice && members.length === 0 && (
          <p className="text-sm text-ink">No members match your search yet.</p>
        )}
      </div>
    </div>
  )
}
