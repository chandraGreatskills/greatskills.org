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

        <nav className="flex items-center gap-1">
          {[...links, ...(me?.role === 'admin' ? [{ to: '/admin', label: 'Admin', Icon: FiShield, end: false }] : [])].map(({ to, label, Icon, end }) => (
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
              <span className="hidden sm:inline">{label}</span>
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
