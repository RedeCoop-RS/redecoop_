import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function scrollToHash(hash: string) {
  const target = document.getElementById(hash.slice(1))
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
    return true
  }
  return false
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    const pathChanged = prevPathname.current !== pathname
    prevPathname.current = pathname

    if (pathChanged) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

      if (hash) {
        requestAnimationFrame(() => {
          if (!scrollToHash(hash)) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
          }
        })
      }
      return
    }

    if (hash) {
      scrollToHash(hash)
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}
