// Small display helpers shared by the pages.

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

// "just now", "5 minutes ago", "3 days ago", then a plain date after a month.
export function timeAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, now - then)
  if (diff < MINUTE) return 'just now'
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`
  if (diff < 60 * MINUTE) return plural(Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return plural(Math.floor(diff / (60 * MINUTE)), 'hour')
  if (diff < 30 * DAY) return plural(Math.floor(diff / DAY), 'day')
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const KIND_LABEL: Record<string, string> = {
  employment: 'Job',
  internship: 'Internship',
  research: 'Research',
  academic: 'Academic',
  fellowship: 'Fellowship',
}
export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind

const MEMBER_LABEL: Record<string, string> = {
  member: 'Member',
  student: 'Student',
  academia: 'Academia',
  industry: 'Industry',
  mentor: 'Mentor',
}
export const memberLabel = (type: string) => MEMBER_LABEL[type] ?? type

// "Remote", the place, or both, but never the same word twice.
export const placeLabel = (o: { remote: boolean; location?: string | null }) => {
  const place = o.location?.trim()
  const said = place && /^remote$/i.test(place) ? '' : place
  if (o.remote) return said ? `Remote · ${said}` : 'Remote'
  return place || 'On-site'
}

// "Closes today", "Closes in 3 days", "Closes 12 Nov", or "Closed".
export function closesLabel(o: { closes_at?: string | null; is_open: boolean }, now = Date.now()) {
  if (!o.is_open) return { text: 'Closed', urgent: false }
  if (!o.closes_at) return null
  // Count calendar days, so a date picked 5 days out reads "in 5 days".
  const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)
  const days = Math.round((midnight(new Date(o.closes_at).getTime()) - midnight(now)) / DAY)
  if (days <= 0) return { text: 'Closes today', urgent: true }
  if (days === 1) return { text: 'Closes tomorrow', urgent: true }
  if (days <= 7) return { text: `Closes in ${days} days`, urgent: true }
  return {
    text: `Closes ${new Date(o.closes_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
    urgent: false,
  }
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Applied',
  reviewed: 'Viewed by poster',
  shortlisted: 'Shortlisted',
  rejected: 'Not selected',
  accepted: 'Offer',
}
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s

// A date picker gives "2026-11-15"; the opening should stay open through the
// end of that day where the poster is.
export const endOfDay = (date: string) => (date ? new Date(`${date}T23:59:59`).toISOString() : null)
export const dateInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
