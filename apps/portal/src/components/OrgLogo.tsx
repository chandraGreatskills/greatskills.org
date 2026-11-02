import { fileUrl } from '../lib/api'

const TILE = ['#012652', '#359706', '#7a5af8', '#0e7490', '#b45309', '#be185d']

// An organization's logo, or a colored tile with its initials.
export default function OrgLogo({ name, url, size = 'h-12 w-12 text-sm' }: { name: string; url?: string | null; size?: string }) {
  if (url) return <img src={fileUrl(url) ?? ''} alt="" className={`${size} shrink-0 rounded-lg bg-white object-contain ring-1 ring-navy/10`} />
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w))
  const initials = (words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')
  const color = TILE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILE.length]
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-lg font-bold uppercase text-white`} style={{ background: color }}>
      {initials}
    </div>
  )
}
