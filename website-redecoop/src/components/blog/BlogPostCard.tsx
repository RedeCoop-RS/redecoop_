import { Link } from 'react-router-dom'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { rewriteGhostAssetUrl } from '@/services/ghost.service'
import { formatBlogDate, formatGhostTagName, postExcerpt, publicTags } from '@/lib/blog'
import type { GhostPost } from '@/types'

export function BlogPostCard({
  post,
  featured = false,
}: {
  post: GhostPost
  featured?: boolean
}) {
  const tags = publicTags(post.tags).slice(0, 2)
  const excerpt = postExcerpt(post, 150)

  return (
    <Link to={`/blog/${post.slug}`} className="blog-modern-card">
      <div className="blog-modern-card__media">
        {post.feature_image ? (
          <OptimizedImage
            src={rewriteGhostAssetUrl(post.feature_image)}
            alt={post.feature_image_alt || post.title}
            loading="lazy"
            placeholder
            className="blog-modern-card__img"
          />
        ) : (
          <div className="blog-modern-card__fallback" />
        )}
        {featured && <span className="blog-modern-card__badge">Destaque</span>}
      </div>
      <div className="blog-modern-card__body">
        {tags.length > 0 && (
          <div className="blog-modern-card__tags">
            {tags.map((tag, index) => (
              <span
                key={tag.id}
                className={`blog-modern-pill${index === 0 ? ' blog-modern-pill--solid' : ''}`}
              >
                {formatGhostTagName(tag.name, tag.slug)}
              </span>
            ))}
          </div>
        )}
        <time className="blog-modern-card__date" dateTime={post.published_at}>
          {formatBlogDate(post.published_at)}
        </time>
        <h3 className="blog-modern-card__title">{post.title}</h3>
        {excerpt && <p className="blog-modern-card__excerpt">{excerpt}</p>}
        <span className="blog-modern-card__more">Saber mais →</span>
      </div>
    </Link>
  )
}
