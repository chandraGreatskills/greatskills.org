import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { ImQuotesLeft } from 'react-icons/im'
import Reveal from './Reveal'
import { testimonials } from '../data/site'

export default function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4500, stopOnInteraction: false })],
  )
  const [selected, setSelected] = useState(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
  }, [emblaApi])

  return (
    <section className="bg-navy-50 py-20 lg:py-24">
      <div className="container-x">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <span className="eyebrow">Success Stories</span>
          <h2 className="h-serif text-3xl sm:text-4xl">
            Where Potential Meets Opportunity
          </h2>
          <p className="mt-4 text-ink">
            Our programs are helping countless individuals and organizations
            achieve their goals, from career advancements to business
            transformations.
          </p>
        </Reveal>

        <Reveal>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 flex-[0_0_100%] px-3 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <div className="flex h-full flex-col rounded-3xl border border-navy/5 bg-white p-8 shadow-soft">
                    <ImQuotesLeft className="mb-4 h-8 w-8 text-green/30" />
                    <p className="flex-1 text-[15px] leading-relaxed text-navy/80">
                      {t.quote}
                    </p>
                    <div className="mt-6 flex items-center gap-4 border-t border-navy/5 pt-5">
                      <img
                        src={t.img}
                        alt={t.name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-green/20"
                      />
                      <div>
                        <p className="font-semibold text-navy">{t.name}</p>
                        <p className="text-xs text-ink">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={scrollPrev}
            aria-label="Previous"
            className="grid h-11 w-11 place-items-center rounded-full border border-navy/10 bg-white text-navy transition hover:bg-navy hover:text-white"
          >
            <FiChevronLeft />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  selected === i ? 'w-6 bg-green' : 'w-2 bg-navy/20'
                }`}
              />
            ))}
          </div>
          <button
            onClick={scrollNext}
            aria-label="Next"
            className="grid h-11 w-11 place-items-center rounded-full border border-navy/10 bg-white text-navy transition hover:bg-navy hover:text-white"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </section>
  )
}
