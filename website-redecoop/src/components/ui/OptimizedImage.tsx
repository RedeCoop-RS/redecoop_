import { useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react'

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Above-the-fold: eager load, no fade */
  eager?: boolean
  /** Fade-in + placeholder bg while loading (photos in fixed containers only) */
  placeholder?: boolean
}

export function OptimizedImage({
  className = '',
  eager = false,
  placeholder = false,
  loading,
  onLoad,
  alt = '',
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    onLoad?.(e)
  }

  const resolvedLoading = loading ?? (eager ? 'eager' : 'lazy')
  const useFade = placeholder && !eager

  const classes = [
    className,
    useFade && 'optimized-img',
    useFade && (loaded ? 'optimized-img--loaded' : 'optimized-img--loading'),
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <img
      {...props}
      alt={alt}
      loading={resolvedLoading}
      decoding="async"
      onLoad={useFade ? handleLoad : onLoad}
      className={classes || undefined}
    />
  )
}
