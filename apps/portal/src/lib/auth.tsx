import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, tokens } from './api'
import type { Me } from './types'

type AuthState = {
  me: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

type RegisterData = {
  email: string
  password: string
  full_name: string
  member_type: string
}

type TokenPair = { access_token: string; refresh_token: string }

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    if (!tokens.access) {
      setMe(null)
      return
    }
    try {
      setMe(await api.get<Me>('/auth/me'))
    } catch {
      tokens.clear()
      setMe(null)
    }
  }, [])

  useEffect(() => {
    refreshMe().finally(() => setLoading(false))
  }, [refreshMe])

  const login = async (email: string, password: string) => {
    const pair = await api.post<TokenPair>('/auth/login', { email, password })
    tokens.set(pair)
    await refreshMe()
  }

  const register = async (data: RegisterData) => {
    const pair = await api.post<TokenPair>('/auth/register', data)
    tokens.set(pair)
    await refreshMe()
  }

  const logout = () => {
    tokens.clear()
    setMe(null)
  }

  return (
    <AuthContext.Provider value={{ me, loading, login, register, logout, refreshMe }}>
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
