import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { Me } from './types'

type AuthState = {
  me: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  // For when the server already ended the session (e.g. "sign out everywhere").
  setSignedOut: () => void
  refreshMe: () => Promise<void>
}

type RegisterData = {
  email: string
  password: string
  full_name: string
  member_type: string
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api.get<Me>('/auth/me'))
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    refreshMe().finally(() => setLoading(false))
  }, [refreshMe])

  const login = async (email: string, password: string) => {
    setMe(await api.post<Me>('/auth/login', { email, password }))
  }

  const register = async (data: RegisterData) => {
    setMe(await api.post<Me>('/auth/register', data))
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setMe(null)
    }
  }

  return (
    <AuthContext.Provider value={{ me, loading, login, register, logout, setSignedOut: () => setMe(null), refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
