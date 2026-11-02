import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from './api'

type Counts = { messages: number; requests: number; alerts: number; refresh: () => void }

const CountsContext = createContext<Counts>({ messages: 0, requests: 0, alerts: 0, refresh: () => {} })

// Unread messages, message requests and notifications for the top bar.
// Checked every 30 seconds, on every page change, and when a page asks.
export function CountsProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState({ messages: 0, requests: 0, alerts: 0 })
  const { pathname } = useLocation()
  const refresh = useCallback(() => {
    Promise.all([
      api.get<{ unread: number; requests: number }>('/messages/unread-count'),
      api.get<{ unread: number }>('/notifications/unread-count'),
    ])
      .then(([m, n]) => setC({ messages: m.unread, requests: m.requests, alerts: n.unread }))
      .catch(() => {})
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh, pathname])
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 30000)
    return () => clearInterval(t)
  }, [refresh])
  return <CountsContext.Provider value={{ ...c, refresh }}>{children}</CountsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCounts = () => useContext(CountsContext)
