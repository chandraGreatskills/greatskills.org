import type { CSSProperties } from 'react'
import { fileUrl } from './api'

// The cover gallery: drawn in code (gradients plus light SVG patterns) in the
// Great Skills navy and green, so there's no stock photography to license and
// nothing to download. The API keeps the same list of names.

const svg = (body: string, w = 400, h = 100) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${body}</svg>`,
  )}")`

const waves = (c: string, o = 0.18) =>
  svg(
    [0, 1, 2, 3]
      .map((i) => `<path d='M0 ${60 + i * 10} C100 ${40 + i * 12} 300 ${90 - i * 8} 400 ${55 + i * 9}' fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='${2 + i}'/>`)
      .join(''),
  )
const dots = (c: string, o = 0.22) =>
  svg(
    Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 40 }, (_, k) => `<circle cx='${k * 10 + (r % 2) * 5 + 5}' cy='${r * 11 + 6}' r='1.3' fill='${c}' fill-opacity='${o * (1 - k / 48)}'/>`).join(''),
    ).join(''),
  )
const grid = (c: string, o = 0.14) =>
  svg(
    Array.from({ length: 21 }, (_, k) => `<line x1='${k * 20}' y1='0' x2='${k * 20}' y2='100' stroke='${c}' stroke-opacity='${o}'/>`).join('') +
      Array.from({ length: 6 }, (_, k) => `<line x1='0' y1='${k * 20}' x2='400' y2='${k * 20}' stroke='${c}' stroke-opacity='${o}'/>`).join(''),
  )
const contour = (c: string, o = 0.2) =>
  svg(
    Array.from({ length: 7 }, (_, i) => `<ellipse cx='330' cy='70' rx='${30 + i * 28}' ry='${14 + i * 12}' fill='none' stroke='${c}' stroke-opacity='${o}'/>`).join(''),
  )
const circuit = (c: string, o = 0.25) =>
  svg(
    Array.from({ length: 10 }, (_, i) => {
      const y = 10 + i * 9
      const x = 180 + ((i * 37) % 120)
      return `<path d='M${x} ${y} H${x + 60} V${y + 8} H400' fill='none' stroke='${c}' stroke-opacity='${o}'/><circle cx='${x}' cy='${y}' r='2' fill='${c}' fill-opacity='${o + 0.15}'/>`
    }).join(''),
  )
const skyline = (c: string, o = 0.2) =>
  svg(
    Array.from({ length: 26 }, (_, i) => {
      const h = 18 + ((i * 53) % 46)
      return `<rect x='${150 + i * 10}' y='${100 - h}' width='8' height='${h}' fill='${c}' fill-opacity='${o}'/>`
    }).join(''),
  )
const mosaic = (c: string, o = 0.16) =>
  svg(
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 20 }, (_, k) => {
        const op = ((r * 7 + k * 13) % 10) / 10
        return `<rect x='${k * 20 + 1}' y='${r * 20 + 1}' width='18' height='18' fill='${c}' fill-opacity='${(o * op * k) / 10}'/>`
      }).join(''),
    ).join(''),
  )
const ripple = (c: string, o = 0.18) =>
  svg(Array.from({ length: 8 }, (_, i) => `<circle cx='60' cy='100' r='${20 + i * 22}' fill='none' stroke='${c}' stroke-opacity='${o}'/>`).join(''))
const leaves = (c: string, o = 0.2) =>
  svg(
    Array.from({ length: 14 }, (_, i) => {
      const x = 200 + ((i * 47) % 190)
      const y = 10 + ((i * 29) % 80)
      return `<path d='M${x} ${y} q8 -10 16 0 q-8 10 -16 0z' fill='${c}' fill-opacity='${o}' transform='rotate(${i * 25} ${x + 8} ${y})'/>`
    }).join(''),
  )

export const COVERS: { key: string; label: string; css: string }[] = [
  { key: 'dawn', label: 'Dawn', css: `${waves('#012652', 0.12)}, linear-gradient(100deg, #cfdcef 0%, #dbe8cf 100%)` },
  { key: 'harbor', label: 'Harbor', css: `${waves('#ffffff', 0.2)}, linear-gradient(100deg, #012652 0%, #0e4f7a 60%, #1f6b3a 100%)` },
  { key: 'meadow', label: 'Meadow', css: `${leaves('#ffffff', 0.22)}, linear-gradient(110deg, #359706 0%, #6fab2f 55%, #a8d17a 100%)` },
  { key: 'campus', label: 'Campus', css: `${grid('#012652', 0.1)}, linear-gradient(100deg, #e9eef6 0%, #dfe8ef 100%)` },
  { key: 'circuit', label: 'Circuit', css: `${circuit('#88c24b', 0.4)}, linear-gradient(100deg, #011c3e 0%, #013a6b 100%)` },
  { key: 'contour', label: 'Contour', css: `${contour('#012652', 0.16)}, linear-gradient(100deg, #f3ead9 0%, #dbe8cf 100%)` },
  { key: 'aurora', label: 'Aurora', css: `radial-gradient(120% 140% at 85% 0%, #6fab2f 0%, transparent 55%), radial-gradient(100% 120% at 10% 100%, #0e7490 0%, transparent 60%), #012652` },
  { key: 'slate', label: 'Slate', css: `${dots('#ffffff', 0.25)}, linear-gradient(100deg, #334155 0%, #475569 100%)` },
  { key: 'sunrise', label: 'Sunrise', css: `${ripple('#ffffff', 0.25)}, linear-gradient(100deg, #f59e0b 0%, #f97316 50%, #e11d48 100%)` },
  { key: 'lagoon', label: 'Lagoon', css: `${waves('#ffffff', 0.25)}, linear-gradient(100deg, #0e7490 0%, #14b8a6 100%)` },
  { key: 'orchard', label: 'Orchard', css: `${leaves('#359706', 0.25)}, linear-gradient(100deg, #f7f3e8 0%, #e6f0dc 100%)` },
  { key: 'skyline', label: 'Skyline', css: `${skyline('#ffffff', 0.18)}, linear-gradient(180deg, #1e3a8a 0%, #012652 100%)` },
  { key: 'mosaic', label: 'Mosaic', css: `${mosaic('#6fab2f', 0.9)}, linear-gradient(100deg, #f1f5f9 0%, #e2e8f0 100%)` },
  { key: 'ripple', label: 'Ripple', css: `${ripple('#012652', 0.14)}, linear-gradient(100deg, #dbeafe 0%, #ede9fe 100%)` },
  { key: 'forest', label: 'Forest', css: `${contour('#ffffff', 0.14)}, linear-gradient(100deg, #14532d 0%, #1f6b3a 60%, #359706 100%)` },
  { key: 'graphite', label: 'Graphite', css: `${grid('#ffffff', 0.08)}, linear-gradient(100deg, #111827 0%, #1f2937 100%)` },
]

// Who gets which design when they haven't picked one.
const DEFAULT_FOR: Record<string, string> = {
  student: 'dawn',
  academia: 'campus',
  industry: 'harbor',
  mentor: 'contour',
  member: 'ripple',
}

// The CSS for a member's cover: their upload, their gallery pick, or the
// default for their member type.
export function coverStyle(cover: string | null | undefined, memberType: string): CSSProperties {
  if (cover && cover.startsWith('/uploads/')) {
    return { backgroundImage: `url("${fileUrl(cover)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  const key = cover?.startsWith('g:') ? cover.slice(2) : DEFAULT_FOR[memberType] ?? 'dawn'
  const design = COVERS.find((c) => c.key === key) ?? COVERS[0]
  return { background: design.css, backgroundSize: 'cover' }
}

export const coverIsDark = (cover: string | null | undefined, memberType: string) => {
  const key = cover?.startsWith('g:') ? cover.slice(2) : cover?.startsWith('/uploads/') ? '' : DEFAULT_FOR[memberType] ?? 'dawn'
  return ['harbor', 'circuit', 'aurora', 'slate', 'skyline', 'forest', 'graphite', 'lagoon', 'meadow', 'sunrise'].includes(key)
}
