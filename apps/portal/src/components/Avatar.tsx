import { fileUrl } from '../lib/api'

const SIZES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-3xl',
  lg: 'h-28 w-28 text-3xl',
}

// A member's photo, or their first initial when there isn't one.
export default function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string
  url?: string | null
  size?: keyof typeof SIZES
}) {
  const box = SIZES[size]
  if (url) {
    return <img src={fileUrl(url) ?? ''} alt="" className={`${box} shrink-0 rounded-full object-cover ring-2 ring-green/15`} />
  }
  return (
    <div className={`${box} grid shrink-0 place-items-center rounded-full bg-navy-50 font-serif font-bold text-navy`}>
      {name[0]}
    </div>
  )
}
