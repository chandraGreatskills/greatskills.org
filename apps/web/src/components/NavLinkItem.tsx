import { useNavigate, useLocation } from 'react-router-dom'

/** Renders a nav link that supports both route paths ("/programs") and
 * home-section anchors ("/#about"). Anchors navigate home first, then scroll. */
export default function NavLinkItem({
  href,
  className,
  onClick,
  children,
}: {
  href: string
  className?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const handle = (e: React.MouseEvent) => {
    if (href.startsWith('/#')) {
      e.preventDefault()
      const id = href.slice(2)
      const scroll = () => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
      if (location.pathname === '/') scroll()
      else {
        navigate('/')
        setTimeout(scroll, 350)
      }
    } else if (href.startsWith('/')) {
      e.preventDefault()
      navigate(href)
    }
    onClick?.()
  }

  return (
    <a href={href} onClick={handle} className={className}>
      {children}
    </a>
  )
}
