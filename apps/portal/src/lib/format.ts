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

// "Remote" or the place, never both, and never the same place twice.
export const placeLabel = (o: { remote: boolean; location?: string | null }) =>
  o.remote ? (o.location ? `Remote · ${o.location}` : 'Remote') : o.location || 'On-site'
