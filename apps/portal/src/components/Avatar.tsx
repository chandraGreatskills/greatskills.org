import { fileUrl } from '../lib/api'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  card: 'h-14 w-14 text-xl',
  sm: 'h-10 w-10 text-sm',
  row: 'h-16 w-16 text-xl',
  md: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-3xl',
  lg: 'h-28 w-28 text-3xl',
}

// A member's photo, or their first initial when there isn't one.
export default function Avatar({
  name,
  url,
  size = 'md',
  square = false,
}: {
  name: string
  url?: string | null
  size?: keyof typeof SIZES
  // Rounded square instead of a circle, for suggestion cards.
  square?: boolean
}) {
  const box = `${SIZES[size]} ${square ? 'rounded-2xl' : 'rounded-full'}`
  if (url) {
    return <img src={fileUrl(url) ?? ''} alt="" className={`${box} shrink-0 object-cover ring-2 ring-green/15`} />
  }
  return (
    <div className={`${box} grid shrink-0 place-items-center bg-navy-50 font-serif font-bold text-navy`}>
      {name[0]}
    </div>
  )
}
