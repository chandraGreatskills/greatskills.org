import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FiGlobe, FiHeart, FiMessageSquare, FiTrash2, FiUsers } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { timeAgo } from '../lib/format'
import type { Affiliation, Post, PostComment } from '../lib/types'
import Avatar from './Avatar'
import DemoBadge from './DemoBadge'
import OrgLogo from './OrgLogo'

const LIMIT = 3000

// "Start a post": as yourself, or as an organization you're verified staff at.
export function Composer({ onPosted, orgSlug }: { onPosted: (p: Post) => void; orgSlug?: string }) {
  const { me } = useAuth()
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(false)
  const [visibility, setVisibility] = useState<'members' | 'connections'>('members')
  const [as, setAs] = useState(orgSlug ?? '')
  const [orgs, setOrgs] = useState<Affiliation[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<Affiliation[]>('/affiliations/me')
      .then((rows) => setOrgs(rows.filter((a) => a.status === 'verified' && (a.kind === 'faculty' || a.kind === 'recruiter'))))
      .catch(() => {})
  }, [])

  if (!me?.profile) return null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const p = await api.post<Post>('/posts', { body, visibility, org_slug: as || undefined })
      setBody('')
      setOpen(false)
      onPosted(p)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex gap-3">
        <Avatar name={me.profile.full_name} url={me.profile.avatar_url} size="sm" />
        <textarea
          className={`field flex-1 resize-none ${open ? 'min-h-[110px]' : 'h-11 rounded-full py-2.5'}`}
          placeholder={me.is_verified ? 'Share an update, a win, or a question' : 'Verify your email to post'}
          disabled={!me.is_verified}
          value={body}
          maxLength={LIMIT}
          onFocus={() => setOpen(true)}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[52px]">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {orgs.length > 0 && (
              <select className="rounded-full border border-navy/20 bg-white px-3 py-1 text-navy" value={as} onChange={(e) => setAs(e.target.value)} aria-label="Post as">
                <option value="">Post as me</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.org_slug}>
                    Post as {o.org_name}
                  </option>
                ))}
              </select>
            )}
            {!as && (
              <select
                className="rounded-full border border-navy/20 bg-white px-3 py-1 text-navy"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'members' | 'connections')}
                aria-label="Who can see this"
              >
                <option value="members">All members</option>
                <option value="connections">Connections only</option>
              </select>
            )}
            <span className="text-xs text-ink">{LIMIT - body.length} left</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-4 py-1.5 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={busy || !body.trim()} className="btn-green px-5 py-1.5 text-sm disabled:opacity-50">
              Post
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}

export function PostCard({ post, onRemoved }: { post: Post; onRemoved: (id: string) => void }) {
  const [p, setP] = useState(post)
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false)
  const long = p.body.length > 420

  const like = async () => {
    const next = !p.liked
    setP({ ...p, liked: next, likes: p.likes + (next ? 1 : -1) })
    try {
      await (next ? api.put(`/posts/${p.id}/like`, {}) : api.del(`/posts/${p.id}/like`))
    } catch {
      setP(p)
    }
  }
  const remove = async () => {
    if (!window.confirm('Delete this post?')) return
    await api.del(`/posts/${p.id}`)
    onRemoved(p.id)
  }

  return (
    <article className="rounded-xl border border-navy/10 bg-white">
      <header className="flex items-start gap-3 px-4 pt-4">
        {p.org ? (
          <Link to={`/org/${p.org.slug}`}>
            <OrgLogo name={p.org.name} url={p.org.logo_url} size="h-11 w-11 text-xs" />
          </Link>
        ) : (
          <Link to={`/in/${p.author.handle}`}>
            <Avatar name={p.author.full_name} url={p.author.avatar_url} size="sm" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            {p.org ? (
              <Link to={`/org/${p.org.slug}`} className="font-semibold text-navy hover:underline">{p.org.name}</Link>
            ) : (
              <Link to={`/in/${p.author.handle}`} className="font-semibold text-navy hover:underline">{p.author.full_name}</Link>
            )}
            <DemoBadge show={p.is_demo} />
          </p>
          <p className="truncate text-xs text-ink">
            {p.org ? `Posted by ${p.author.full_name}` : p.author.headline}
          </p>
          <p className="flex items-center gap-1 text-xs text-ink/70">
            {timeAgo(p.created_at)} ·{' '}
            {p.visibility === 'connections' ? <FiUsers className="h-3 w-3" title="Connections only" /> : <FiGlobe className="h-3 w-3" title="All members" />}
          </p>
        </div>
        {p.can_delete && (
          <button onClick={remove} aria-label="Delete post" className="grid h-8 w-8 place-items-center rounded-full text-navy/40 hover:bg-red-50 hover:text-red-600">
            <FiTrash2 className="h-4 w-4" />
          </button>
        )}
      </header>
      <div className="px-4 py-3">
        <p className={`whitespace-pre-line text-sm leading-6 text-navy ${long && !more ? 'line-clamp-5' : ''}`}>{p.body}</p>
        {long && (
          <button onClick={() => setMore(!more)} className="text-sm font-medium text-ink hover:text-navy">
            {more ? 'Show less' : '…more'}
          </button>
        )}
      </div>
      {(p.likes > 0 || p.comments > 0) && (
        <p className="flex justify-between px-4 pb-2 text-xs text-ink">
          <span>{p.likes > 0 && `${p.likes} like${p.likes === 1 ? '' : 's'}`}</span>
          <button onClick={() => setOpen(!open)} className="hover:underline">
            {p.comments > 0 && `${p.comments} comment${p.comments === 1 ? '' : 's'}`}
          </button>
        </p>
      )}
      <div className="flex border-t border-navy/5 px-2">
        <button onClick={like} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:bg-navy-50 ${p.liked ? 'text-green-deep' : 'text-ink'}`}>
          <FiHeart className={`h-4 w-4 ${p.liked ? 'fill-current' : ''}`} /> {p.liked ? 'Liked' : 'Like'}
        </button>
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-ink hover:bg-navy-50">
          <FiMessageSquare className="h-4 w-4" /> Comment
        </button>
      </div>
      {open && <Comments postId={p.id} onCount={(n) => setP((x) => ({ ...x, comments: n }))} />}
    </article>
  )
}

function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { me } = useAuth()
  const [rows, setRows] = useState<PostComment[] | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(
    () => api.get<PostComment[]>(`/posts/${postId}/comments`).then((r) => {
      setRows(r)
      onCount(r.length)
    }),
    [postId, onCount],
  )
  useEffect(() => {
    load().catch(() => setRows([]))
    // onCount changes identity every render; loading once per post is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/posts/${postId}/comments`, { body })
      setBody('')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not comment')
    }
  }
  const remove = async (c: PostComment) => {
    await api.del(`/posts/${postId}/comments/${c.id}`)
    load()
  }

  return (
    <div className="space-y-3 border-t border-navy/5 px-4 py-3">
      {me?.profile && (
        <form onSubmit={send} className="flex gap-2">
          <Avatar name={me.profile.full_name} url={me.profile.avatar_url} size="xs" />
          <input className="field h-9 flex-1 rounded-full py-1 text-sm" maxLength={1000} placeholder="Add a comment" value={body} onChange={(e) => setBody(e.target.value)} />
          <button disabled={!body.trim()} className="rounded-full bg-navy px-4 text-sm font-semibold text-white disabled:opacity-40">
            Send
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rows?.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Link to={`/in/${c.author.handle}`}>
            <Avatar name={c.author.full_name} url={c.author.avatar_url} size="xs" />
          </Link>
          <div className="min-w-0 flex-1 rounded-lg bg-navy-50/70 px-3 py-2">
            <p className="flex items-center justify-between gap-2 text-xs">
              <Link to={`/in/${c.author.handle}`} className="font-semibold text-navy hover:underline">{c.author.full_name}</Link>
              <span className="flex items-center gap-2 text-ink/70">
                {timeAgo(c.created_at)}
                {c.can_delete && (
                  <button onClick={() => remove(c)} aria-label="Delete comment" className="hover:text-red-600">
                    <FiTrash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            </p>
            <p className="whitespace-pre-line text-sm text-navy">{c.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// A list of posts with "Show more" paging. query: '' for the main feed,
// 'author=<id>' or 'org=<slug>' for one member or organization.
export function PostList({ query = '', composer = false, orgSlug, empty = 'No posts yet.' }: { query?: string; composer?: boolean; orgSlug?: string; empty?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [more, setMore] = useState(false)
  const PAGE = 15
  const load = useCallback(
    async (before?: string) => {
      const q = new URLSearchParams(query)
      q.set('limit', String(PAGE))
      if (before) q.set('before', before)
      const page = await api.get<Post[]>(`/posts?${q}`)
      setPosts((cur) => (before && cur ? [...cur, ...page] : page))
      setMore(page.length === PAGE)
    },
    [query],
  )
  useEffect(() => {
    load().catch(() => setPosts([]))
  }, [load])

  return (
    <div className="space-y-3">
      {composer && <Composer orgSlug={orgSlug} onPosted={(p) => setPosts((cur) => [p, ...(cur ?? [])])} />}
      {posts?.map((p) => (
        <PostCard key={p.id} post={p} onRemoved={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />
      ))}
      {posts && posts.length === 0 && <p className="rounded-xl border border-navy/10 bg-white px-4 py-5 text-sm text-ink">{empty}</p>}
      {more && posts && (
        <button onClick={() => load(posts[posts.length - 1].created_at)} className="btn-ghost w-full">
          Show more posts
        </button>
      )}
    </div>
  )
}
