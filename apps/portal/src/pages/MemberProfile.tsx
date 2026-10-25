import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiEye, FiMapPin } from 'react-icons/fi'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { memberLabel } from '../lib/format'
import type { ProfileView } from '../lib/types'
import Avatar from '../components/Avatar'
import ConnectButton from '../components/ConnectButton'
import DemoBadge from '../components/DemoBadge'
import RoleBadges from '../components/RoleBadges'

const PREVIEWS = [
  { value: 'public', label: 'Logged-out visitor' },
  { value: 'member', label: 'Member' },
  { value: 'connection', label: 'Connection' },
] as const

// Another member's profile, exactly as the API trimmed it for this viewer.
// An owner opening their own link gets a "viewing as" switcher instead of a
// Connect button.
export default function MemberProfile() {
  const { handle } = useParams()
  const [params, setParams] = useSearchParams()
  const { me } = useAuth()
  const [view, setView] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const own = me?.profile?.handle === handle
  const as = params.get('as')

  useEffect(() => {
    setView(null)
    setError('')
    const q = own && as ? `?as=${as}` : ''
    api
      .get<ProfileView>(`/profiles/${handle}${q}`)
      .then(setView)
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'This profile is not available.' : 'Could not load this profile.'))
  }, [handle, as, own])

  if (error) return <p className="text-sm text-ink">{error}</p>
  if (!view) return <p className="text-navy/50">Loading profile…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={own ? '/profile' : '/members'} className="inline-flex items-center gap-1 text-sm text-green-deep">
        <FiArrowLeft className="h-4 w-4" /> {own ? 'Back to edit profile' : 'Back to network'}
      </Link>

      {own && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm font-medium text-navy">
            <FiEye className="h-4 w-4 text-green-deep" /> Viewing your profile as
          </p>
          <div className="flex flex-wrap gap-2">
            {PREVIEWS.map((p) => (
              <button
                key={p.value}
                onClick={() => setParams({ as: p.value })}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  view.viewer === p.value ? 'bg-green-shine text-white' : 'bg-navy-50 text-navy/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={view.full_name} url={view.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-serif text-2xl font-semibold text-navy">
            {view.full_name}
            <DemoBadge show={view.is_demo} />
          </h1>
          <p className="text-ink">{view.headline || memberLabel(view.member_type)}</p>
          <RoleBadges roles={view.verified_roles} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
            {view.location && (
              <span className="flex items-center gap-1">
                <FiMapPin className="h-3.5 w-3.5" /> {view.location}
              </span>
            )}
            {view.industry && <span>{view.industry}</span>}
            {view.open_to_mentor && <span className="font-medium text-green-deep">Open to mentor</span>}
            {view.open_to_work && <span className="font-medium text-green-deep">Open to work</span>}
          </div>
        </div>
        {!own && (
          <ConnectButton
            className="sm:w-40"
            member={{ ...view, user_id: view.user_id }}
          />
        )}
      </div>

      {view.bio && (
        <Section title="About">
          <p className="whitespace-pre-line text-sm text-navy">{view.bio}</p>
          {view.bio_truncated && <Hint />}
        </Section>
      )}

      {view.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {view.skills.map((s) => (
              <span key={s} className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy">
                {s}
              </span>
            ))}
          </div>
          {view.skills_truncated && <Hint />}
        </Section>
      )}

      {view.experiences.length > 0 && (
        <Section title="Experience">
          <ul className="space-y-3">
            {view.experiences.map((e) => (
              <li key={e.id}>
                <p className="font-semibold text-navy">{e.title}</p>
                <p className="text-sm text-ink">
                  {e.company}
                  {e.start_year && ` · ${e.start_year}–${e.end_year || 'Present'}`}
                </p>
                {e.description && <p className="mt-1 text-sm text-navy">{e.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {view.education.length > 0 && (
        <Section title="Education">
          <ul className="space-y-3">
            {view.education.map((e) => (
              <li key={e.id}>
                <p className="font-semibold text-navy">{e.school}</p>
                <p className="text-sm text-ink">
                  {[e.degree, e.field].filter(Boolean).join(', ')}
                  {e.start_year && ` · ${e.start_year}–${e.end_year || 'Present'}`}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {view.interests.length > 0 && (
        <Section title="Interests">
          <p className="text-sm text-navy">{view.interests.join(' · ')}</p>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-3 font-serif text-lg font-semibold text-navy">{title}</h2>
      {children}
    </div>
  )
}

function Hint() {
  return <p className="mt-2 text-xs text-ink">Sign in to see the full profile.</p>
}
