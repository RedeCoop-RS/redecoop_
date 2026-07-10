/** Scroll reveal without opacity — avoids image flicker inside animated containers */
export const slideInView = {
  initial: { opacity: 1, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
}

export const slideInViewDelayed = (delay = 0) => ({
  ...slideInView,
  transition: { ...slideInView.transition, delay },
})

/** Text-only sections — opacity fade is fine without images */
export const fadeInView = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
}

export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
}

export const fadeInDelayed = (delay = 0) => ({
  ...fadeIn,
  transition: { ...fadeIn.transition, delay },
})
