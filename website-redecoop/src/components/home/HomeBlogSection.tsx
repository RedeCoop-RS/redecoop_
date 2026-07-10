import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { rewriteGhostAssetUrl } from '@/services/ghost.service'
import { slideInView, slideInViewDelayed } from '@/lib/motion'
import type { GhostPost } from '@/types'

interface HomeBlogSectionProps {
  posts: GhostPost[]
  loading: boolean
  formatDate: (date: string) => string
}

export function HomeBlogSection({ posts, loading, formatDate }: HomeBlogSectionProps) {
  if (!loading && posts.length === 0) return null

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <section className="relative overflow-hidden">
      <div className="home-stripe-bar" aria-hidden="true">
        <span className="home-stripe-bar__mint" />
        <span className="home-stripe-bar__green" />
        <span className="home-stripe-bar__yellow" />
      </div>

      <div className="bg-section-editorial py-20 lg:py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <span className="home-kicker">Fique por dentro</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-ink">
                Últimas do <span className="text-green">Blog</span>
              </h2>
              <p className="mt-3 text-grey-dark max-w-lg">
                Notícias, artigos e novidades sobre cooperativismo e agricultura familiar no RS.
              </p>
            </div>
            {!loading && (
              <motion.div whileHover={{ y: -3, scale: 1.03 }} transition={{ duration: 0.3 }} className="hidden md:block shrink-0">
                <Link to="/blog" className="home-blog-link inline-flex items-center gap-2">
                  Ver todos <ArrowRight size={18} />
                </Link>
              </motion.div>
            )}
          </div>

          <div className="relative min-h-[420px]">
            <div
              aria-hidden={!loading}
              className={`space-y-8 transition-opacity duration-500 ${
                loading ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            >
              <div className="h-72 rounded-3xl bg-white/60 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white/60 animate-pulse" />
                ))}
              </div>
            </div>

            <div
              className={`transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
            >
              {featured && (
                <motion.div {...slideInView}>
                  <Link to={`/blog/${featured.slug}`} className="group block mb-10">
                    <article className="home-blog-featured">
                      <div className="home-blog-featured__media">
                        {featured.feature_image ? (
                          <OptimizedImage
                            src={rewriteGhostAssetUrl(featured.feature_image)}
                            alt={featured.feature_image_alt || featured.title}
                            loading="lazy"
                            placeholder
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green to-green-light" />
                        )}
                      </div>
                      <div className="home-blog-featured__body">
                        {featured.tags?.[0] && (
                          <span className="home-blog-tag">{featured.tags[0].name}</span>
                        )}
                        <h3 className="font-display text-2xl md:text-3xl font-bold text-ink group-hover:text-green transition-colors leading-snug">
                          {featured.title}
                        </h3>
                        {featured.excerpt && (
                          <p className="mt-3 text-grey-dark leading-relaxed line-clamp-3">{featured.excerpt}</p>
                        )}
                        <div className="mt-6 flex items-center justify-between text-sm">
                          <span className="text-grey">{formatDate(featured.published_at)}</span>
                          <span className="font-bold text-green group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            Ler artigo <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              )}

              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {rest.map((post, i) => (
                    <motion.div key={post.id} {...slideInViewDelayed(i * 0.1)}>
                      <Link to={`/blog/${post.slug}`} className="group block h-full">
                        <article className="home-blog-card h-full">
                          <div className="home-blog-card__media">
                            {post.feature_image ? (
                              <OptimizedImage
                                src={rewriteGhostAssetUrl(post.feature_image)}
                                alt={post.feature_image_alt || post.title}
                                loading="lazy"
                                placeholder
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green/30 to-green-soft" />
                            )}
                          </div>
                          <div className="home-blog-card__body">
                            {post.tags?.[0] && <span className="home-blog-tag">{post.tags[0].name}</span>}
                            <h3 className="font-bold text-ink group-hover:text-green transition-colors line-clamp-2 leading-snug">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="mt-2 text-sm text-grey line-clamp-2">{post.excerpt}</p>
                            )}
                            <div className="home-blog-card__footer">
                              <span className="text-xs text-grey">{formatDate(post.published_at)}</span>
                              <span className="text-xs font-bold text-green">Ler →</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-12 md:hidden">
            <motion.div whileHover={{ y: -3, scale: 1.03 }} transition={{ duration: 0.3 }} className="inline-block">
              <Link to="/blog">
                <Button arrow>Ver todos os posts</Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
