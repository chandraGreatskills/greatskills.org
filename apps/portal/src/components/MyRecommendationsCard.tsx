import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Recommendation } from '../lib/types'
import { RecommendationItem } from './Recommendations'

type Mine = { received: Recommendation[]; given: Recommendation[] }

// On the member's own profile editor: approve or hide recommendations they
// received, and withdraw ones they wrote.
export default function MyRecommendationsCard() {
  const { me } = useAuth()
  const [mine, setMine] = useState<Mine | null>(null)
  const load = useCallback(() => api.get<Mine>('/recommendations/me').then(setMine).catch(() => {}), [])
  useEffect(() => {
    load()
  }, [load])

  if (!mine || !me?.profile) return null
  const owner = me.profile.full_name
  const pending = mine.received.filter((r) => r.status === 'pending')
  const shown = mine.received.filter((r) => r.status === 'shown')
  const hidden = mine.received.filter((r) => r.status === 'hidden')

  const respond = async (r: Recommendation, show: boolean) => {
    await api.post(`/recommendations/${r.id}/respond?show=${show}`)
    load()
  }
  const remove = async (r: Recommendation, question: string) => {
    if (!window.confirm(question)) return
    await api.del(`/recommendations/${r.id}`)
    load()
  }

  const PILL = 'rounded-full border px-4 py-1 text-sm font-semibold'

  return (
    <div className="card">
      <h3 className="font-serif text-lg font-semibold text-navy">Recommendations</h3>
      <p className="mt-1 text-sm text-ink">
        Recommendations from your connections show on your profile only after you accept them.
      </p>

      {pending.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-amber-800">
            Waiting for you ({pending.length})
          </p>
          <ul className="space-y-4">
            {pending.map((r) => (
              <li key={r.id}>
                <RecommendationItem r={r} side="received" owner={owner}>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => respond(r, true)} className={`${PILL} border-navy bg-navy text-white`}>
                      Show on my profile
                    </button>
                    <button onClick={() => respond(r, false)} className={`${PILL} border-navy/30 text-navy`}>
                      Hide
                    </button>
                  </div>
                </RecommendationItem>
              </li>
            ))}
          </ul>
        </div>
      )}

      {[...shown, ...hidden].length > 0 && (
        <ul className="mt-4 divide-y divide-navy/5">
          {[...shown, ...hidden].map((r) => (
            <li key={r.id} className="py-3">
              <RecommendationItem r={r} side="received" owner={owner}>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className={r.status === 'shown' ? 'font-medium text-green-deep' : 'text-ink'}>
                    {r.status === 'shown' ? 'Shown on your profile' : 'Hidden'}
                  </span>
                  <button onClick={() => respond(r, r.status !== 'shown')} className="font-semibold text-navy hover:underline">
                    {r.status === 'shown' ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => remove(r, 'Delete this recommendation for good?')} className="text-ink hover:text-red-600">
                    Delete
                  </button>
                </div>
              </RecommendationItem>
            </li>
          ))}
        </ul>
      )}

      {mine.given.length > 0 && (
        <>
          <p className="mt-5 text-sm font-semibold text-navy">You wrote ({mine.given.length})</p>
          <ul className="mt-2 divide-y divide-navy/5">
            {mine.given.map((r) => (
              <li key={r.id} className="py-3">
                <RecommendationItem r={r} side="given" owner={owner}>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-ink">
                      {r.status === 'shown' ? 'Shown on their profile' : r.status === 'pending' ? 'Waiting for them to accept' : 'They chose not to show it'}
                    </span>
                    <button onClick={() => remove(r, 'Withdraw this recommendation?')} className="text-ink hover:text-red-600">
                      Withdraw
                    </button>
                  </div>
                </RecommendationItem>
              </li>
            ))}
          </ul>
        </>
      )}

      {mine.received.length === 0 && mine.given.length === 0 && (
        <p className="mt-4 text-sm text-ink">
          None yet. Ask a professor, manager or mentor you're connected with: they can write one from your profile page.
        </p>
      )}
    </div>
  )
}
