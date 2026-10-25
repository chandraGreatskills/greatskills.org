import { NavLink, useNavigate } from 'react-router-dom'
import { FiHome, FiUsers, FiBriefcase, FiUser, FiLogOut, FiShield } from 'react-icons/fi'
import { useAuth } from '../lib/auth'
import { fileUrl } from '../lib/api'

const links = [
  { to: '/', label: 'Feed', Icon: FiHome, end: true },
  { to: '/members', label: 'Network', Icon: FiUsers },
  { to: '/opportunities', label: 'Opportunities', Icon: FiBriefcase },
  { to: '/profile', label: 'Profile', Icon: FiUser },
]

const navLinks = (role?: string) => [
  ...links,
  ...(role === 'admin' ? [{ to: '/admin', label: 'Admin', Icon: FiShield, end: false }] : []),
]

// Phones get the sections as a labeled tab bar at the bottom, in thumb reach,
// the way the LinkedIn and Facebook apps do it.
export function BottomNav() {
  const { me } = useAuth()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      {navLinks(me?.role).map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive ? 'text-green-deep' : 'text-navy/60'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function TopNav() {
  const { me, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-navy/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center">
          <img
            src="/assets/GreatSkills_Logo-1.svg"
            alt="Great Skills"
            className="h-9 w-auto"
          />
        </NavLink>

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks(me?.role).map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-green/10 text-green-deep'
                    : 'text-navy/70 hover:bg-navy-50'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {me?.profile?.avatar_url ? (
            <img
              src={fileUrl(me.profile.avatar_url) ?? ''}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-green/20"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-50 text-sm font-semibold text-navy">
              {me?.profile?.full_name?.[0] ?? 'U'}
            </span>
          )}
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
