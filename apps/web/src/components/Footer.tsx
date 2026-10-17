import { Link } from 'react-router-dom'
import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi'
import { FaFacebookF, FaLinkedinIn, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa'
import { footer } from '../data/site'

const footerLinkTo: Record<string, string> = {
  Programs: '/programs',
  Resources: '/resources',
  Careers: '/career',
  'Connect Us': '/connect',
}

const socials = [
  { Icon: FaFacebookF, label: 'Facebook' },
  { Icon: FaLinkedinIn, label: 'Linkedin' },
  { Icon: FaTwitter, label: 'Twitter' },
  { Icon: FaInstagram, label: 'Instagram' },
  { Icon: FaYoutube, label: 'Youtube' },
]

export default function Footer() {
  return (
    <footer id="footer" className="bg-navy-900 pt-16 text-white/70">
      <div className="container-x grid gap-12 pb-14 lg:grid-cols-[1.6fr_1fr_1.4fr]">
        <div>
          <img
            src="/assets/GreatSkills_Logo-1.svg"
            alt="Great Skills"
            className="mb-5 h-10 w-auto brightness-0 invert"
          />
          <p className="max-w-md text-sm leading-relaxed text-white/60">
            {footer.blurb}
          </p>
          <div className="mt-6">
            <p className="text-sm font-semibold text-white">The Future Belongs to You</p>
            <p className="mb-3 mt-1 text-sm text-white/60">Follow on social media</p>
            <div className="flex gap-3">
              {socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-green-shine"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-white">
            About
          </h4>
          <ul className="space-y-3 text-sm">
            {footer.columns[0].links.map((l) => (
              <li key={l}>
                <Link
                  to={footerLinkTo[l] ?? '/'}
                  className="transition hover:text-green-light"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-white">
            Get in Touch
          </h4>
          <ul className="space-y-3 text-sm">
            {footer.phones.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <FiPhone className="h-4 w-4 text-green-light" /> {p}
              </li>
            ))}
            <li className="flex items-center gap-3">
              <FiMail className="h-4 w-4 text-green-light" />
              <a href={`mailto:${footer.email}`} className="hover:text-green-light">
                {footer.email}
              </a>
            </li>
          </ul>

          <h4 className="mb-4 mt-8 text-sm font-bold uppercase tracking-wider text-white">
            Locations
          </h4>
          <ul className="space-y-3 text-sm">
            {footer.locations.map((loc) => (
              <li key={loc.country} className="flex gap-3">
                <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-light" />
                <span>
                  <span className="font-semibold text-white">{loc.country}</span>{' '}
                  {loc.address}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-white/50 sm:flex-row">
          <p>© 2024 Great Skills. All Rights Reserved.</p>
          <div className="flex flex-wrap gap-5">
            {footer.legal.map((l) => (
              <Link key={l.to} to={l.to} className="transition hover:text-green-light">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
