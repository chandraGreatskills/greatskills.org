const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const PREFIX = '/api/v1'

const ACCESS_KEY = 'gs_access'
const REFRESH_KEY = 'gs_refresh'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
    localStorage.setItem(ACCESS_KEY, access_token)
    localStorage.setItem(REFRESH_KEY, refresh_token)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function raw(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (tokens.access) headers.set('Authorization', `Bearer ${tokens.access}`)

  const res = await fetch(`${BASE}${PREFIX}${path}`, { ...init, headers })

  // transparent refresh on 401
  if (res.status === 401 && retry && tokens.refresh) {
    const refreshed = await fetch(`${BASE}${PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh }),
    })
    if (refreshed.ok) {
      tokens.set(await refreshed.json())
      return raw(path, init, false)
    }
    tokens.clear()
  }
  return res
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* noop */
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(p: string) => raw(p).then((r) => handle<T>(r)),
  post: <T>(p: string, body?: unknown) =>
    raw(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then((r) =>
      handle<T>(r),
    ),
  patch: <T>(p: string, body: unknown) =>
    raw(p, { method: 'PATCH', body: JSON.stringify(body) }).then((r) => handle<T>(r)),
  del: (p: string) => raw(p, { method: 'DELETE' }).then((r) => handle<void>(r)),
  upload: <T>(p: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return raw(p, { method: 'POST', body: fd }).then((r) => handle<T>(r))
  },
}

export const fileUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : `${BASE}${path}`) : null
