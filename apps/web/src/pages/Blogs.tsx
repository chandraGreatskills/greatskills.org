import PageHero from '../components/PageHero'
import Reveal from '../components/Reveal'
import EmailCapture from '../components/EmailCapture'
import { blogPosts } from '../data/site'

export default function Blogs() {
  return (
    <>
      <PageHero
        eyebrow="Blogs"
        title="Recent"
        highlight="Blogs"
        subtitle="Insights, success stories, and the latest thinking on learning, data and professional growth."
      />

      <section className="bg-white py-16 lg:py-20">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.08}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-card">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.img}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <span className="self-start rounded-full bg-green/10 px-3 py-1 text-xs font-semibold text-green-deep">
                      {post.tag}
                    </span>
                    <h2 className="h-serif mt-3 text-xl">{post.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink">
                      {post.excerpt}
                    </p>
                    <p className="mt-4 text-xs text-navy/40">{post.date}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <EmailCapture />
    </>
  )
}
