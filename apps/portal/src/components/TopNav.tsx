import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiBell, FiBriefcase, FiHome, FiLogOut, FiMessageSquare, FiShield, FiUser, FiUsers } from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useCounts } from '../lib/counts'
import { timeAgo } from '../lib/format'
import type { AppNotification } from '../lib/types'
import Avatar from './Avatar'

type Item = { to: string; label: string; Icon: typeof FiHome; end?: boolean; count?: number }

function items(role: string | undefined, messages: number): Item[] {
  return [
    { to: '/', label: 'Home', Icon: FiHome, end: true },
    { to: '/members', label: 'Network', Icon: FiUsers },
    { to: '/opportunities', label: 'Opportunities', Icon: FiBriefcase },
    { to: '/messages', label: 'Messages', Icon: FiMessageSquare, count: messages },
    ...(role === 'admin' ? [{ to: '/admin', label: 'Admin', Icon: FiShield }] : []),
  ]
}

function Badge({ n }: { n?: number }) {
  if (!n) return null
  return (
    <span className="absolute -right-3 -top-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-green-deep px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {n > 99 ? '99+' : n}
    </span>
  )
}

// Phones get the sections as a labeled tab bar at the bottom, in thumb reach.
export function BottomNav() {
  const { me } = useAuth()
  const { messages, requests, alerts } = useCounts()
  const list = [...items(me?.role, messages + requests).filter((i) => i.to !== '/admin'), { to: '/notifications', label: 'Alerts', Icon: FiBell, count: alerts }]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      {list.map(({ to, label, Icon, end, count }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-green-deep' : 'text-navy/60'}`}
        >
          <span className="relative">
            <Icon className="h-5 w-5" />
            <Badge n={count} />
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

// The bell: the latest notifications in a dropdown, all of them on /notifications.
function Bell() {
  const { alerts, refresh } = useCounts()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<AppNotification[] | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    api.get<AppNotification[]>('/notifications?limit=8').then(setRows).catch(() => setRows([]))
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const go = async (n: AppNotification) => {
    setOpen(false)
    if (!n.read) await api.post(`/notifications/${n.id}/read`).catch(() => {})
    refresh()
    navigate(n.link)
  }
  const readAll = async () => {
    await api.post('/notifications/read-all')
    setRows((r) => r?.map((n) => ({ ...n, read: true })) ?? null)
    refresh()
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${alerts ? `, ${alerts} unread` : ''}`}
        className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${open ? 'bg-green/10 text-green-deep' : 'text-navy/70 hover:bg-navy-50'}`}
      >
        <span className="relative">
          <FiBell className="h-4 w-4" />
          <Badge n={alerts} />
        </span>
        <span className="hidden lg:inline">Alerts</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-xl border border-navy/10 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-navy/5 px-4 py-3">
            <p className="font-semibold text-navy">Notifications</p>
            {alerts > 0 && (
              <button onClick={readAll} className="text-xs font-semibold text-green-deep hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-navy/5 overflow-y-auto">
            {rows?.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-navy-50 ${n.read ? '' : 'bg-green/5'}`}>
                  {n.actor ? <Avatar name={n.actor.full_name} url={n.actor.avatar_url} size="sm" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green/10 text-green-deep"><FiBell className="h-4 w-4" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm leading-5 text-navy ${n.read ? '' : 'font-semibold'}`}>{n.text}</span>
                    <span className="text-xs text-ink">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-deep" />}
                </button>
              </li>
            ))}
            {rows && rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink">You're all caught up.</li>}
            {!rows && <li className="px-4 py-6 text-center text-sm text-ink">Loading…</li>}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-navy/5 py-2.5 text-center text-sm font-semibold text-ink hover:bg-navy-50 hover:text-navy">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

export default function TopNav() {
  const { me, logout } = useAuth()
  const { messages, requests } = useCounts()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-navy/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center">
          <img src="/assets/GreatSkills_Logo-1.svg" alt="Great Skills" className="h-11 w-auto" />
        </NavLink>

        <nav className="hidden items-center gap-1 sm:flex">
          {items(me?.role, messages + requests).map(({ to, label, Icon, end, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-green/10 text-green-deep' : 'text-navy/70 hover:bg-navy-50'}`
              }
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                <Badge n={count} />
              </span>
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
          <Bell />
        </nav>

        <div className="flex items-center gap-2">
          {/* Opens the member's own page as others see it; editing is a button there. */}
          <NavLink to={me?.profile?.handle ? `/in/${me.profile.handle}` : '/profile'} title="My profile" className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-green/30">
            {me?.profile ? <Avatar name={me.profile.full_name} url={me.profile.avatar_url} size="sm" /> : <FiUser className="h-5 w-5" />}
          </NavLink>
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            title="Log out"
            className="grid h-9 w-9 place-items-center rounded-lg text-navy/60 hover:bg-navy-50 hover:text-navy"
          >
            <FiLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
