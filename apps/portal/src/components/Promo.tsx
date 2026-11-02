import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiInfo, FiMoreHorizontal, FiStar, FiZap } from 'react-icons/fi'
import { api, fileUrl } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Promotion, SiteUpdate } from '../lib/types'
import OrgLogo from './OrgLogo'

async function open(p: Promotion) {
  // The click is counted in aggregate; the sponsor never learns who.
  const { url } = await api.post<{ url: string }>(`/promotions/${p.id}/click`)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function Why({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative">
      <button onClick={() => setShow(!show)} aria-label="Why am I seeing this?" className="grid h-6 w-6 place-items-center rounded-full text-ink/60 hover:bg-navy-50">
        <FiInfo className="h-3.5 w-3.5" />
      </button>
      {show && (
        <span className="absolute right-0 top-7 z-20 w-56 rounded-lg border border-navy/10 bg-white p-3 text-xs leading-5 text-ink shadow-lg">
          {text}. Sponsors never see who you are; they get view and click totals only.
        </span>
      )}
    </span>
  )
}

// A sponsored card for the right column of home.
export function RailPromotions() {
  const [rows, setRows] = useState<Promotion[]>([])
  useEffect(() => {
    api.get<Promotion[]>('/promotions?placement=rail').then(setRows).catch(() => {})
  }, [])
  return (
    <>
      {rows.map((p) => (
        <div key={p.id} className="overflow-hidden rounded-xl border border-navy/10 bg-white">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-navy">
              <OrgLogo name={p.sponsor} size="h-7 w-7 text-[10px]" /> {p.sponsor}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink/70">
              Sponsored <Why text={p.why} />
            </span>
          </div>
          {p.image_url && <img src={fileUrl(p.image_url) ?? ''} alt="" className="mt-3 h-36 w-full object-cover" />}
          <div className="px-4 pb-4 pt-3">
            <p className="font-semibold leading-5 text-navy">{p.title}</p>
            <p className="mt-1 text-sm leading-5 text-ink">{p.body}</p>
            <button onClick={() => open(p)} className="mt-3 w-full rounded-full border border-navy/60 py-1.5 text-sm font-semibold text-navy hover:bg-navy-50">
              {p.cta}
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

// A sponsored post between feed posts.
export function FeedPromotion({ p }: { p: Promotion }) {
  return (
    <article className="overflow-hidden rounded-xl border border-navy/10 bg-white">
      <header className="flex items-center gap-3 px-4 pt-4">
        <OrgLogo name={p.sponsor} size="h-11 w-11 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{p.sponsor}</p>
          <p className="text-xs font-semibold text-ink/70">Sponsored</p>
        </div>
        <Why text={p.why} />
      </header>
      <p className="px-4 py-3 text-sm leading-6 text-navy">{p.body}</p>
      {p.image_url && <img src={fileUrl(p.image_url) ?? ''} alt="" className="max-h-80 w-full object-cover" />}
      <div className="flex items-center justify-between gap-3 bg-navy-50/60 px-4 py-3">
        <p className="font-semibold text-navy">{p.title}</p>
        <button onClick={() => open(p)} className="shrink-0 rounded-full border border-navy/60 px-4 py-1.5 text-sm font-semibold text-navy hover:bg-white">
          {p.cta}
        </button>
      </div>
    </article>
  )
}

// "Great Skills updates": short news from the team.
export function UpdatesBlock() {
  const [rows, setRows] = useState<SiteUpdate[]>([])
  const [all, setAll] = useState(false)
  useEffect(() => {
    api.get<SiteUpdate[]>('/updates?limit=8').then(setRows).catch(() => {})
  }, [])
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, 3)
  return (
    <div className="rounded-xl border border-navy/10 bg-white">
      <h2 className="flex items-center gap-2 px-4 pt-4 font-semibold text-navy">
        <FiZap className="h-4 w-4 text-green-deep" /> Great Skills updates
      </h2>
      <ul className="px-4 py-2">
        {shown.map((u) => (
          <li key={u.id} className="py-2">
            {u.link ? (
              <a href={u.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold leading-5 text-navy hover:underline">{u.title}</a>
            ) : (
              <p className="text-sm font-semibold leading-5 text-navy">{u.title}</p>
            )}
            {u.body && <p className="text-xs leading-5 text-ink">{u.body}</p>}
            <p className="text-[11px] text-ink/60">{new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
          </li>
        ))}
      </ul>
      {rows.length > 3 && (
        <button onClick={() => setAll(!all)} className="flex w-full items-center justify-center gap-1 border-t border-navy/5 py-2.5 text-sm font-semibold text-ink hover:bg-navy-50 hover:text-navy">
          {all ? 'Show less' : 'Show all updates'} <FiArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

const HIDE_KEY = 'gs-plus-offer-hidden-until'

// The upgrade card, for members without Achievers Plus. Can be hidden for 30 days.
export function PlusOffer() {
  const { me } = useAuth()
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try {
      return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now()
    } catch {
      return false
    }
  })
  if (!me || me.is_plus || hidden) return null
  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + 30 * 86400000))
    } catch {
      /* storage blocked: hide for this visit only */
    }
    setHidden(true)
  }
  return (
    <div className="relative grid overflow-hidden rounded-xl border border-navy/10 bg-white sm:grid-cols-[1fr_200px]">
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-deep">
          <FiStar className="h-3.5 w-3.5 fill-current" /> Achievers Plus
        </p>
        <p className="mt-2 text-lg font-semibold leading-6 text-navy">Get your resume reviewed by people who hire</p>
        <p className="mt-1 text-sm leading-6 text-ink">
          Section-by-section feedback from career services and mentors, plus mentor sessions and interview prep.
        </p>
        <Link to="/plus" className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-2 text-sm font-semibold text-white hover:bg-green">
          {me.plus_requested ? 'Request sent: see details' : 'See what you get'}
        </Link>
      </div>
      <div className="relative hidden items-center justify-center bg-gradient-to-br from-[#e6f0dc] to-[#dbe6f3] sm:flex">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-sm">
          <FiStar className="h-12 w-12 fill-[#6fab2f] text-[#359706]" />
        </div>
      </div>
      <div className="absolute right-2 top-2">
        <button onClick={() => setMenu(!menu)} aria-label="Options" className="grid h-8 w-8 place-items-center rounded-full text-navy/50 hover:bg-white/70">
          <FiMoreHorizontal className="h-5 w-5" />
        </button>
        {menu && (
          <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-navy/10 bg-white py-1 shadow-lg">
            <button onClick={hide} className="block w-full px-4 py-2 text-left text-sm text-navy hover:bg-navy-50">
              Hide for 30 days
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
