import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import AuthShell from './AuthShell'

const memberTypes = [
  { value: 'student', label: 'Student' },
  { value: 'member', label: 'Professional' },
  { value: 'academia', label: 'Academia' },
  { value: 'industry', label: 'Industry' },
  { value: 'mentor', label: 'Mentor' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    member_type: 'student',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form)
      navigate('/profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Join Great Skills"
      subtitle="Create your profile and connect with opportunity."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
        <div>
          <label className="label">Full name</label>
          <input className="field" required value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set('password')}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="label">I am a…</label>
          <select className="field" value={form.member_type} onChange={set('member_type')}>
            {memberTypes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-green w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink">
        Already a member?{' '}
        <Link to="/login" className="font-semibold text-green-deep">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
