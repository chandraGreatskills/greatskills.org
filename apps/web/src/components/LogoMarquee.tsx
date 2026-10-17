import { partnerLogos } from '../data/site'

export default function LogoMarquee() {
  const row = [...partnerLogos, ...partnerLogos]
  return (
    <section className="border-y border-navy/5 bg-white py-12">
      <div className="container-x">
        <p className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.15em] text-navy/50">
          A few logos from where our delighted students come
        </p>
      </div>
      <div className="group relative overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
        <div className="flex w-max animate-marquee items-center gap-16 px-8 group-hover:[animation-play-state:paused]">
          {row.map((logo, i) => (
            <img
              key={i}
              src={logo.src}
              alt={logo.name}
              className="h-10 w-auto max-w-[150px] object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
