import Reveal from './Reveal'
import { offerings } from '../data/site'

// staggered vertical offsets to match the original masonry-style layout
const offsets = ['lg:mt-0', 'lg:mt-16', 'lg:mt-0', 'lg:mt-16']

export default function Offerings() {
  return (
    <section id="offerings" className="bg-navy-50 py-20 lg:py-24">
      <div className="container-x">
        <Reveal className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="h-serif text-3xl sm:text-4xl lg:text-[2.75rem]">
            Explore Our World-Class Offerings
          </h2>
          <p className="mt-4 text-ink">
            From cutting-edge learning programs to skill development and
            consulting, Great Skills offers a holistic approach to growth,
            ensuring you have the tools you need to succeed.
          </p>
        </Reveal>

        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {offerings.map((o, i) => (
            <Reveal key={o.title} delay={i * 0.08} className={offsets[i]}>
              <div className="group">
                <div className="overflow-hidden rounded-3xl">
                  <img
                    src={o.img}
                    alt={o.title}
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="h-serif mt-5 text-xl">{o.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  {o.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
