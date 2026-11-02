import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText, FiFilm, FiGlobe, FiHeart, FiImage, FiMessageSquare, FiShare2, FiTrash2, FiUsers, FiVideo, FiX } from 'react-icons/fi'
import { ApiError, api, fileUrl } from '../lib/api'
import { shrinkImage } from '../lib/images'
import { useAuth } from '../lib/auth'
import { timeAgo } from '../lib/format'
import type { Affiliation, Post, PostComment, PostVideo, Promotion } from '../lib/types'
import { FeedPromotion } from './Promo'
import Avatar from './Avatar'
import DemoBadge from './DemoBadge'
import OrgLogo from './OrgLogo'

const LIMIT = 3000
const ARTICLE_LIMIT = 20000

// "Start a post": as yourself, or as an organization you're verified staff
// at. Add up to four photos, a YouTube or Vimeo link, or write an article.
export function Composer({ onPosted, orgSlug }: { onPosted: (p: Post) => void; orgSlug?: string }) {
  const { me } = useAuth()
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(false)
  const [article, setArticle] = useState(false)
  const [title, setTitle] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState('')
  const [showVideo, setShowVideo] = useState(false)
  const [upload, setUpload] = useState<PostVideo | null>(null)
  const [uploading, setUploading] = useState(false)
  const videoInput = useRef<HTMLInputElement>(null)
  const [visibility, setVisibility] = useState<'members' | 'connections'>('members')
  const [as, setAs] = useState(orgSlug ?? '')
  const [orgs, setOrgs] = useState<Affiliation[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .get<Affiliation[]>('/affiliations/me')
      .then((rows) => setOrgs(rows.filter((a) => a.status === 'verified' && (a.kind === 'faculty' || a.kind === 'recruiter'))))
      .catch(() => {})
  }, [])

  if (!me?.profile) return null
  const limit = article ? ARTICLE_LIMIT : LIMIT
  const reset = () => {
    setBody('')
    setTitle('')
    setImages([])
    setVideo('')
    setShowVideo(false)
    setUpload(null)
    setArticle(false)
    setOpen(false)
  }
  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setError('')
    for (const f of Array.from(files).slice(0, 4 - images.length)) {
      try {
        const small = await shrinkImage(f)
        const { url } = await api.upload<{ url: string }>('/posts/images', small)
        setImages((cur) => [...cur, url].slice(0, 4))
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not add that photo')
      }
    }
  }
  const addVideo = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (file.size > 200 * 1024 * 1024) return setError('Videos can be at most 200 MB')
    setUploading(true)
    try {
      setUpload(await api.upload<PostVideo>('/posts/videos', file))
      setShowVideo(false)
      setVideo('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload that video')
    } finally {
      setUploading(false)
    }
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const p = await api.post<Post>('/posts', {
        body,
        visibility,
        org_slug: as || undefined,
        kind: article ? 'article' : 'post',
        title: article ? title : undefined,
        images,
        video_url: video.trim() || undefined,
        video_id: upload?.id,
      })
      reset()
      onPosted(p)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }
  const tool = 'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-navy/70 hover:bg-navy-50'

  return (
    <form onSubmit={submit} className="rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex gap-3">
        <Avatar name={me.profile.full_name} url={me.profile.avatar_url} size="sm" />
        <div className="flex-1 space-y-2">
          {article && (
            <input className="field text-base font-semibold" placeholder="Article title" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          )}
          <textarea
            className={`field w-full resize-none ${open ? (article ? 'min-h-[220px]' : 'min-h-[110px]') : 'h-11 rounded-full py-2.5'}`}
            placeholder={!me.is_verified ? 'Verify your email to post' : article ? 'Write your article…' : 'Share an update, a win, or a question'}
            disabled={!me.is_verified}
            value={body}
            maxLength={limit}
            onFocus={() => setOpen(true)}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 pl-[52px]">
          {images.map((src) => (
            <div key={src} className="relative">
              <img src={fileUrl(src) ?? ''} alt="" className="h-20 w-full rounded-lg object-cover" />
              <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== src))} aria-label="Remove photo" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-navy/70 text-white">
                <FiX className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {(uploading || upload) && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-navy-50 px-3 py-2 pl-[52px] text-sm text-navy">
          <span className="flex items-center gap-2">
            <FiFilm className="h-4 w-4 text-sky-600" />
            {uploading ? 'Uploading video…' : 'Video attached. It will be ready to play a minute or two after you post.'}
          </span>
          {upload && (
            <button type="button" onClick={() => setUpload(null)} aria-label="Remove video" className="grid h-6 w-6 place-items-center rounded-full hover:bg-white">
              <FiX className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {showVideo && (
        <div className="mt-3 pl-[52px]">
          <input className="field text-sm" placeholder="Paste a YouTube or Vimeo link" value={video} onChange={(e) => setVideo(e.target.value)} />
        </div>
      )}
      {me.is_verified && (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-[44px]">
          <button type="button" onClick={() => { setOpen(true); photoInput.current?.click() }} disabled={images.length >= 4} className={tool}>
            <FiImage className="h-4 w-4 text-green-deep" /> Photo
          </button>
          {me.can_upload_video && (
            <button type="button" disabled={uploading || !!upload} onClick={() => { setOpen(true); videoInput.current?.click() }} className={tool}>
              <FiFilm className="h-4 w-4 text-sky-600" /> Upload video
            </button>
          )}
          <button type="button" disabled={!!upload} onClick={() => { setOpen(true); setShowVideo(!showVideo) }} className={tool}>
            <FiVideo className="h-4 w-4 text-sky-600" /> Video link
          </button>
          <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => { addVideo(e.target.files?.[0]); e.target.value = '' }} />
          <button type="button" onClick={() => { setOpen(true); setArticle(!article) }} className={`${tool} ${article ? 'bg-navy-50' : ''}`}>
            <FiFileText className="h-4 w-4 text-amber-600" /> {article ? 'Back to a short post' : 'Write article'}
          </button>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
        </div>
      )}
      {open && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-navy/5 pt-3">
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
              <select className="rounded-full border border-navy/20 bg-white px-3 py-1 text-navy" value={visibility} onChange={(e) => setVisibility(e.target.value as 'members' | 'connections')} aria-label="Who can see this">
                <option value="members">All members</option>
                <option value="connections">Connections only</option>
              </select>
            )}
            <span className="text-xs text-ink">{limit - body.length} left</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="btn-ghost px-4 py-1.5 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={busy || !body.trim() || (article && !title.trim())} className="btn-green px-5 py-1.5 text-sm disabled:opacity-50">
              {article ? 'Publish' : 'Post'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}

// Photos laid out like a small collage: one wide, two side by side, three
// or four in a grid.
function Photos({ images }: { images: string[] }) {
  if (!images.length) return null
  const cls = images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
  return (
    <div className={`grid ${cls} gap-0.5 overflow-hidden`}>
      {images.map((src, i) => (
        <a key={src} href={fileUrl(src) ?? ''} target="_blank" rel="noreferrer" className={images.length === 3 && i === 0 ? 'col-span-2' : ''}>
          <img src={fileUrl(src) ?? ''} alt="" loading="lazy" className={`w-full object-cover ${images.length === 1 ? 'max-h-[520px]' : 'h-56'}`} />
        </a>
      ))}
    </div>
  )
}

// An uploaded video: plays once converted, says so while it's processing.
function NativeVideo({ v }: { v: PostVideo }) {
  const [cur, setCur] = useState(v)
  useEffect(() => {
    if (cur.status !== 'processing') return
    // Only the uploader can ask for status; everyone else sees it on next load.
    const t = setInterval(() => api.get<PostVideo>(`/posts/videos/${cur.id}`).then(setCur).catch(() => clearInterval(t)), 5000)
    return () => clearInterval(t)
  }, [cur.id, cur.status])
  if (cur.status === 'ready' && cur.url) {
    return <video controls preload="metadata" playsInline poster={fileUrl(cur.poster) ?? undefined} src={fileUrl(cur.url) ?? ''} className="max-h-[560px] w-full bg-black" />
  }
  if (cur.status === 'processing') {
    return <p className="mx-4 mb-3 rounded-lg bg-navy-50 px-4 py-6 text-center text-sm text-ink">Video is processing. It will appear here shortly.</p>
  }
  return null
}

export function PostCard({ post, onRemoved, full = false }: { post: Post; onRemoved: (id: string) => void; full?: boolean }) {
  const [p, setP] = useState(post)
  const [open, setOpen] = useState(full)
  const [more, setMore] = useState(false)
  const [copied, setCopied] = useState(false)
  const isArticle = p.kind === 'article'
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
  const share = async () => {
    const link = `${window.location.origin}/posts/${p.id}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', link)
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-navy/10 bg-white">
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
          <p className="truncate text-xs text-ink">{p.org ? `Posted by ${p.author.full_name}` : p.author.headline}</p>
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
      {isArticle && !full ? (
        <Link to={`/posts/${p.id}`} className="mx-4 my-3 block rounded-lg border border-navy/10 bg-navy-50/50 p-4 hover:bg-navy-50">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Article</span>
          <span className="mt-1 block text-lg font-semibold leading-6 text-navy">{p.title}</span>
          <span className="mt-1 line-clamp-3 text-sm leading-6 text-ink">{p.body}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green-deep">Read article →</span>
        </Link>
      ) : (
        <div className="px-4 py-3">
          {isArticle && <h1 className="mb-3 text-2xl font-semibold leading-8 text-navy">{p.title}</h1>}
          <p className={`whitespace-pre-line text-sm leading-6 text-navy ${long && !more && !full ? 'line-clamp-5' : ''} ${full && isArticle ? 'text-base leading-7' : ''}`}>{p.body}</p>
          {long && !full && (
            <button onClick={() => setMore(!more)} className="text-sm font-medium text-ink hover:text-navy">
              {more ? 'Show less' : '…more'}
            </button>
          )}
        </div>
      )}
      <Photos images={p.images ?? []} />
      {p.video && <NativeVideo v={p.video} />}
      {p.video_url && (
        <div className="aspect-video w-full bg-navy">
          <iframe
            src={p.video_url}
            title="Video"
            loading="lazy"
            className="h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      )}
      {(p.likes > 0 || p.comments > 0) && (
        <p className="flex justify-between px-4 pb-2 pt-2 text-xs text-ink">
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
        <button onClick={share} className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-ink hover:bg-navy-50">
          <FiShare2 className="h-4 w-4" /> {copied ? 'Link copied' : 'Share'}
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
  const [promos, setPromos] = useState<Promotion[]>([])
  useEffect(() => {
    if (!query) api.get<Promotion[]>('/promotions?placement=feed').then(setPromos).catch(() => {})
  }, [query])
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
      {posts?.map((p, i) => (
        <Fragment key={p.id}>
          <PostCard post={p} onRemoved={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />
          {/* One sponsored post after every fourth post, main feed only. */}
          {!query && i % 4 === 3 && promos[Math.floor(i / 4) % Math.max(promos.length, 1)] && (
            <FeedPromotion p={promos[Math.floor(i / 4) % promos.length]} />
          )}
        </Fragment>
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
