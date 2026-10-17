import type { ReactNode } from 'react'

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-green p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-green/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-green-light/20 blur-3xl" />
        <div className="relative flex items-center">
          <img
            src="/assets/GreatSkills_Logo-1.svg"
            alt="Great Skills"
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
        <div className="relative">
          <h1 className="font-serif text-4xl font-semibold leading-tight">
            Where potential meets opportunity.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Connect with learners, mentors, industry, and academia. Build your
            profile, share your resume, and open new doors, academic and
            professional.
          </p>
        </div>
        <p className="relative text-sm text-white/50">
          The Future Belongs to You.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <h2 className="font-serif text-3xl font-semibold text-navy">{title}</h2>
          <p className="mt-2 text-sm text-ink">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
