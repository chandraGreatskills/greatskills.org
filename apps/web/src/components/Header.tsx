import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiMenu, FiX } from 'react-icons/fi'
import { nav, PORTAL_URL } from '../data/site'
import NavLinkItem from './NavLinkItem'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-soft' : 'shadow-[0_1px_0_rgba(1,38,82,0.06)]'
      }`}
    >
      <div className="container-x flex h-[84px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/assets/GreatSkills_Logo-1.svg"
            alt="Great Skills"
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <NavLinkItem
              key={item.label}
              href={item.href}
              className="text-[15px] font-medium text-navy/80 transition-colors hover:text-green-deep"
            >
              {item.label}
            </NavLinkItem>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <a
            href={PORTAL_URL}
            className="text-[15px] font-semibold text-green-deep transition-colors hover:text-green"
          >
            Login
          </a>
          <a href={PORTAL_URL} className="btn-green !px-6 !py-3 !text-xs !uppercase !tracking-wider">
            Join for Free
          </a>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white lg:hidden"
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-navy/5 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x flex flex-col gap-1 py-4">
              {nav.map((item) => (
                <NavLinkItem
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-navy/80 hover:bg-navy-50"
                >
                  {item.label}
                </NavLinkItem>
              ))}
              <div className="mt-2 flex gap-3">
                <a href={PORTAL_URL} className="btn-outline flex-1">
                  Login
                </a>
                <a href={PORTAL_URL} className="btn-green flex-1">
                  Join for Free
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
