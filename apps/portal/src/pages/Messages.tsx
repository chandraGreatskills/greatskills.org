import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FiArchive, FiArrowLeft, FiCheck, FiMoreHorizontal, FiSearch, FiSlash, FiStar, FiTrash2, FiUser,
} from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import { useCounts } from '../lib/counts'
import type { ChatMessage, Conversation, Thread } from '../lib/types'
import Avatar from '../components/Avatar'
import DemoBadge from '../components/DemoBadge'

type Box = 'all' | 'unread' | 'requests' | 'starred' | 'archived'
const BOXES: { value: Box; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'requests', label: 'Requests' },
  { value: 'starred', label: 'Starred' },
  { value: 'archived', label: 'Archived' },
]

function shortTime(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

// Inbox on the left, the open conversation on the right. On phones they
// take turns: the list, then the conversation with a back arrow.
export default function Messages() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refresh, requests } = useCounts()
  const [box, setBox] = useState<Box>('all')
  const [q, setQ] = useState('')
  const [list, setList] = useState<Conversation[] | null>(null)

  const load = useCallback(() => {
    const p = new URLSearchParams({ box })
    if (q.trim()) p.set('q', q.trim())
    return api.get<Conversation[]>(`/messages/conversations?${p}`).then(setList).catch(() => setList([]))
  }, [box, q])
  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    return () => clearInterval(t)
    // q is applied on Enter, not per keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box])

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-navy/10 bg-white">
      {/* One bar across the top: title, search and filters, so the inbox column stays uncluttered. */}
      <div className={`flex-wrap items-center gap-3 border-b border-navy/10 px-4 py-3 ${id ? 'hidden md:flex' : 'flex'}`}>
        <h1 className="text-lg font-semibold text-navy">Messages</h1>
        <div className="relative min-w-[200px] flex-1 md:max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <input
            className="field h-9 rounded-lg py-1 pl-9 text-sm"
            placeholder="Search names and messages"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BOXES.map((b) => (
            <button
              key={b.value}
              onClick={() => setBox(b.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${box === b.value ? 'bg-navy text-white' : 'border border-navy/15 text-navy/70 hover:bg-navy-50'}`}
            >
              {b.label}
              {b.value === 'requests' && requests > 0 && <span className="ml-1 rounded-full bg-green-deep px-1.5 text-white">{requests}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
      <aside className={`flex min-h-0 flex-col border-r border-navy/10 ${id ? 'hidden md:flex' : 'flex'}`}>
        <ul className="min-h-0 flex-1 divide-y divide-navy/5 overflow-y-auto">
          {list?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/messages/${c.id}`}
                className={`flex gap-3 px-3 py-3 hover:bg-navy-50/70 ${c.id === id ? 'bg-green/5 shadow-[inset_3px_0_0_#359706]' : ''}`}
              >
                <Avatar name={c.other.full_name} url={c.other.avatar_url} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm text-navy ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.other.full_name}</span>
                    <span className="shrink-0 text-[11px] text-ink">{shortTime(c.last_message_at)}</span>
                  </span>
                  {c.opportunity_title && <span className="block truncate text-[11px] font-medium text-green-deep">About: {c.opportunity_title}</span>}
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs ${c.unread ? 'font-semibold text-navy' : 'text-ink'}`}>
                      {c.incoming_request && <b className="text-amber-700">Request · </b>}
                      {c.last_message_mine ? 'You: ' : ''}
                      {c.last_message}
                    </span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-green-deep px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    {c.starred && !c.unread && <FiStar className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {list && list.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-ink">
              {box === 'requests' ? 'No message requests.' : q ? 'Nothing matches.' : 'No conversations yet. Message a connection from their profile.'}
            </li>
          )}
        </ul>
      </aside>
      <section className={`min-h-0 ${id ? 'flex' : 'hidden md:flex'} flex-col`}>
        {id ? (
          <ThreadView key={id} id={id} onChange={() => { load(); refresh() }} onGone={() => navigate('/messages')} />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-sm text-ink">Pick a conversation, or start one from a member's profile.</div>
        )}
      </section>
      </div>
    </div>
  )
}

function ThreadView({ id, onChange, onGone }: { id: string; onChange: () => void; onGone: () => void }) {
  const [t, setT] = useState<Thread | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const count = useRef(0)

  const load = useCallback(
    () =>
      api
        .get<Thread>(`/messages/conversations/${id}`)
        .then((x) => {
          setT(x)
          if (x.messages.length !== count.current) {
            count.current = x.messages.length
            setTimeout(() => end.current?.scrollIntoView({ block: 'end' }), 30)
          }
        })
        .catch((err) => err instanceof ApiError && err.status === 404 && onGone()),
    [id, onGone],
  )
  useEffect(() => {
    load().then(onChange)
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 5000)
    return () => clearInterval(timer)
    // onChange is a fresh function each render; refreshing once on open is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!body.trim()) return
    setError('')
    try {
      const x = await api.post<Thread>(`/messages/conversations/${id}/messages`, { body })
      setBody('')
      setT(x)
      count.current = x.messages.length
      setTimeout(() => end.current?.scrollIntoView({ block: 'end' }), 30)
      onChange()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
    }
  }
  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }
  const file = async (patch: { starred?: boolean; archived?: boolean }) => {
    setMenu(false)
    await api.patch(`/messages/conversations/${id}`, patch)
    await load()
    onChange()
  }
  const respond = async (accept: boolean) => {
    if (accept) {
      setT(await api.post<Thread>(`/messages/conversations/${id}/accept`))
      onChange()
    } else {
      await api.post(`/messages/conversations/${id}/decline`)
      onChange()
      onGone()
    }
  }
  const block = async () => {
    setMenu(false)
    if (!t || !window.confirm(`Block ${t.other.full_name}? Neither of you will be able to message or find the other.`)) return
    await api.post(`/connections/block/${t.other.user_id}`)
    onChange()
    onGone()
  }
  const unsend = async (m: ChatMessage) => {
    await api.del(`/messages/${m.id}`)
    load()
    onChange()
  }

  if (!t) return <div className="grid flex-1 place-items-center text-sm text-ink">Loading…</div>

  const lastSeen = [...t.messages].reverse().find((m) => m.mine && m.seen)
  let prevDay = ''

  return (
    <>
      <header className="flex items-center gap-3 border-b border-navy/10 px-4 py-3">
        <Link to="/messages" className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-50 md:hidden" aria-label="Back to messages">
          <FiArrowLeft className="h-4 w-4" />
        </Link>
        <Link to={`/in/${t.other.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={t.other.full_name} url={t.other.avatar_url} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-semibold text-navy hover:underline">
              <span className="truncate">{t.other.full_name}</span>
              <DemoBadge show={t.is_demo} />
            </span>
            <span className="block truncate text-xs text-ink">{t.opportunity_title ? `About: ${t.opportunity_title}` : t.other.headline}</span>
          </span>
        </Link>
        <button onClick={() => file({ starred: !t.starred })} aria-label={t.starred ? 'Unstar' : 'Star'} className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-50">
          <FiStar className={`h-4 w-4 ${t.starred ? 'fill-amber-400 text-amber-400' : 'text-navy/60'}`} />
        </button>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} aria-label="More" className="grid h-9 w-9 place-items-center rounded-full text-navy/60 hover:bg-navy-50">
            <FiMoreHorizontal className="h-5 w-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-52 rounded-lg border border-navy/10 bg-white py-1 shadow-lg">
              <Link to={`/in/${t.other.handle}`} className="flex items-center gap-2 px-4 py-2 text-sm text-navy hover:bg-navy-50">
                <FiUser className="h-4 w-4" /> View profile
              </Link>
              <button onClick={() => file({ archived: !t.archived })} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-navy hover:bg-navy-50">
                <FiArchive className="h-4 w-4" /> {t.archived ? 'Move to inbox' : 'Archive'}
              </button>
              <button onClick={block} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <FiSlash className="h-4 w-4" /> Block {t.other.full_name.split(' ')[0]}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-navy-50/30 px-4 py-4">
        {t.messages.map((m) => {
          const day = dayLabel(m.created_at)
          const showDay = day !== prevDay
          prevDay = day
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-ink/60">{day}</p>}
              <div className={`group flex items-end gap-2 ${m.mine ? 'justify-end' : 'justify-start'}`}>
                {m.mine && m.can_unsend && (
                  <button onClick={() => unsend(m)} title="Unsend" className="mb-1 hidden h-7 w-7 place-items-center rounded-full text-navy/40 hover:bg-red-50 hover:text-red-600 group-hover:grid">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                    m.unsent ? 'border border-dashed border-navy/20 italic text-ink' : m.mine ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-navy shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.unsent ? 'Message unsent' : m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${m.mine && !m.unsent ? 'text-white/60' : 'text-ink/60'}`}>
                    {new Date(m.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {lastSeen?.id === m.id && (
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-ink">
                  <FiCheck className="h-3 w-3 text-green-deep" /> Seen
                </p>
              )}
            </div>
          )
        })}
        <div ref={end} />
      </div>

      {t.incoming_request ? (
        <div className="border-t border-navy/10 bg-amber-50/60 px-4 py-3">
          <p className="text-sm text-navy">
            <b>{t.other.full_name}</b> isn't a connection yet and would like to talk. Reply or accept to continue.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => respond(true)} className="rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white">
              Accept
            </button>
            <button onClick={() => respond(false)} className="rounded-full border border-navy/30 px-4 py-1.5 text-sm font-semibold text-navy">
              Decline
            </button>
          </div>
        </div>
      ) : null}

      {t.can_send ? (
        <form onSubmit={send} className="border-t border-navy/10 p-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              className="field max-h-40 min-h-[42px] flex-1 resize-none py-2.5 text-sm"
              placeholder="Write a message"
              value={body}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={keys}
            />
            <button disabled={!body.trim()} className="h-[42px] rounded-xl bg-green-deep px-5 text-sm font-semibold text-white disabled:opacity-40">
              Send
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink/70">Enter to send · Shift+Enter for a new line</p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </form>
      ) : (
        <p className="border-t border-navy/10 px-4 py-3 text-sm text-ink">{t.reason}</p>
      )}
    </>
  )
}
