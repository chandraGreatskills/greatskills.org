const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const PREFIX = '/api/v1'

// Sign-in lives in httpOnly cookies the page can't read. The one readable
// cookie, gs_csrf, is copied into a header on every change so the API knows
// the request came from this page and not from another site.
function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)gs_csrf=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

// Tokens used to be kept in localStorage. Remove any left behind.
try {
  localStorage.removeItem('gs_access')
  localStorage.removeItem('gs_refresh')
} catch {
  /* storage blocked: nothing to clean */
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// One refresh at a time: if several requests hit an expired token together,
// they all wait on the same renewal instead of racing each other.
let refreshing: Promise<boolean> | null = null
function renew(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}${PREFIX}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken() },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function raw(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const method = (init.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') headers.set('X-CSRF-Token', csrfToken())

  const res = await fetch(`${BASE}${PREFIX}${path}`, { ...init, headers, credentials: 'include' })

  // transparent refresh on 401, except for the sign-in calls themselves
  if (res.status === 401 && retry && !path.startsWith('/auth/login') && (await renew())) {
    return raw(path, init, false)
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
  // Fetch a private file with the member's token and hand it to the browser
  // as a download. A plain link can't carry the token.
  download: async (p: string, filename: string) => {
    const res = await raw(p)
    if (!res.ok) await handle<void>(res)
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  upload: <T>(p: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return raw(p, { method: 'POST', body: fd }).then((r) => handle<T>(r))
  },
}

export const fileUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : `${BASE}${path}`) : null
