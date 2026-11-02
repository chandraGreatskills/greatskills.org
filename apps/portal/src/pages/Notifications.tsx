import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import { api } from '../lib/api'
import { useCounts } from '../lib/counts'
import { timeAgo } from '../lib/format'
import type { AppNotification } from '../lib/types'
import Avatar from '../components/Avatar'

// Every notification, newest first, with an Unread filter.
export default function Notifications() {
  const [rows, setRows] = useState<AppNotification[] | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { refresh } = useCounts()
  const navigate = useNavigate()

  useEffect(() => {
    api.get<AppNotification[]>(`/notifications?limit=100${unreadOnly ? '&unread=true' : ''}`).then(setRows).catch(() => setRows([]))
  }, [unreadOnly])

  const go = async (n: AppNotification) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`).catch(() => {})
    refresh()
    navigate(n.link)
  }
  const readAll = async () => {
    await api.post('/notifications/read-all')
    setRows((r) => (unreadOnly ? [] : r?.map((n) => ({ ...n, read: true })) ?? null))
    refresh()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-navy">Notifications</h1>
        <div className="flex items-center gap-2">
          {(['All', 'Unread'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setUnreadOnly(l === 'Unread')}
              className={`rounded-full px-4 py-1 text-sm font-semibold ${unreadOnly === (l === 'Unread') ? 'bg-navy text-white' : 'border border-navy/15 text-navy/70'}`}
            >
              {l}
            </button>
          ))}
          <button onClick={readAll} className="text-sm font-semibold text-green-deep hover:underline">
            Mark all read
          </button>
        </div>
      </div>
      <ul className="divide-y divide-navy/5 overflow-hidden rounded-xl border border-navy/10 bg-white">
        {rows?.map((n) => (
          <li key={n.id}>
            <button onClick={() => go(n)} className={`flex w-full gap-3 px-4 py-3.5 text-left hover:bg-navy-50 ${n.read ? '' : 'bg-green/5'}`}>
              {n.actor ? (
                <Avatar name={n.actor.full_name} url={n.actor.avatar_url} size="sm" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green/10 text-green-deep">
                  <FiBell className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm leading-5 text-navy ${n.read ? '' : 'font-semibold'}`}>{n.text}</span>
                <span className="text-xs text-ink">{timeAgo(n.created_at)}</span>
              </span>
              {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-green-deep" aria-label="Unread" />}
            </button>
          </li>
        ))}
        {rows && rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink">{unreadOnly ? 'No unread notifications.' : 'Nothing yet. Connect with people and post an update to get things going.'}</li>}
        {!rows && <li className="px-4 py-10 text-center text-sm text-ink">Loading…</li>}
      </ul>
    </div>
  )
}
