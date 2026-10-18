import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMonitor, FiShield } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Session = {
  id: string
  created_at: string
  last_seen_at?: string | null
  user_agent?: string | null
  current: boolean
}

// A rough, readable device name from the browser's user-agent string.
function device(ua?: string | null) {
  if (!ua) return 'Unknown device'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function SecurityCard() {
  const { setSignedOut } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => api.get<Session[]>('/auth/sessions').then(setSessions).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  const change = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      setMsg({ ok: true, text: 'Password changed. Your other devices were signed out.' })
      setCurrent('')
      setNext('')
      setOpen(false)
      load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not change password' })
    }
  }

  const end = async (id: string) => {
    await api.del(`/auth/sessions/${id}`)
    load()
  }

  const everywhere = async () => {
    if (!window.confirm('Sign out on every device, including this one?')) return
    await api.post('/auth/logout-all')
    setSignedOut()
    navigate('/login')
  }

  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-navy">
        <FiShield className="h-4 w-4 text-green-deep" /> Security
      </h3>
      {msg && <p className={`mb-3 text-sm ${msg.ok ? 'text-green-deep' : 'text-red-600'}`}>{msg.text}</p>}

      {open ? (
        <form onSubmit={change} className="mb-4 space-y-2">
          <input className="field" type="password" placeholder="Current password" autoComplete="current-password"
            required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <input className="field" type="password" placeholder="New password (8+ characters)" autoComplete="new-password"
            required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-green flex-1">Save</button>
            <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn-ghost mb-4 w-full" onClick={() => setOpen(true)}>Change password</button>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink">Where you're signed in</p>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm text-navy">
            <FiMonitor className="h-4 w-4 shrink-0 text-navy/50" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{device(s.user_agent)}</span>
              <span className="block text-xs text-ink">
                {s.current ? 'This device' : `Last active ${when(s.last_seen_at || s.created_at)}`}
              </span>
            </span>
            {!s.current && (
              <button onClick={() => end(s.id)} className="text-xs text-ink hover:text-red-600">Sign out</button>
            )}
          </li>
        ))}
      </ul>
      <button onClick={everywhere} className="mt-4 w-full text-sm font-semibold text-red-600 hover:underline">
        Sign out everywhere
      </button>
    </div>
  )
}
