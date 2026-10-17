import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import TopNav from './TopNav'

export default function Layout() {
  const { me, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-navy/50">
        Loading…
      </div>
    )
  }
  if (!me) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
