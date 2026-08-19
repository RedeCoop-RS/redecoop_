import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { slideInView, slideInViewDelayed } from '@/lib/motion'
import type { GhostPost } from '@/types'
import '@/styles/blog.css'

interface HomeBlogSectionProps {
  posts: GhostPost[]
  loading: boolean
  error?: boolean
}

export function HomeBlogSection({ posts, loading, error = false }: HomeBlogSectionProps) {
  if (!loading && posts.length === 0 && !error) return null

  return (
    <section className="relative overflow-hidden">
      <div className="home-stripe-bar" aria-hidden="true">
        <span className="home-stripe-bar__mint" />
        <span className="home-stripe-bar__green" />
        <span className="home-stripe-bar__yellow" />
      </div>

      <div className="blog-home-section">
        <div className="blog-home-section__inner">
          <motion.div {...slideInView} className="blog-home-intro">
            <span className="home-kicker">Fique por dentro</span>
            <h2 className="blog-home-intro__title">
              Últimas do <span className="text-green">Blog</span>
            </h2>
            <p className="blog-home-intro__lead">
              Notícias, artigos e novidades sobre cooperativismo e agricultura familiar no RS.
            </p>
          </motion.div>

          {error && !loading && (
            <p className="blog-home-error">
              Não foi possível carregar os artigos agora. Tente novamente ou{' '}
              <Link to="/blog">abra o blog</Link>.
            </p>
          )}

          {loading && (
            <div className="blog-modern-grid blog-modern-grid--home">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="blog-modern-skeleton" />
              ))}
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="blog-modern-grid blog-modern-grid--home">
              {posts.map((post, i) => (
                <motion.div key={post.id} {...slideInViewDelayed(i * 0.08)}>
                  <BlogPostCard post={post} featured={i === 0} />
                </motion.div>
              ))}
            </div>
          )}

          {!error && (
            <div className="blog-home-cta">
              <Link to="/blog" className="blog-home-all">
                Ver todos <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
