const softEase = [0.16, 1, 0.3, 1] as const

/** Scroll reveal without opacity — avoids image flicker inside animated containers */
export const slideInView = {
  initial: { opacity: 1, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 1.05, ease: softEase },
}

export const slideInViewDelayed = (delay = 0) => ({
  ...slideInView,
  transition: { ...slideInView.transition, delay },
})

/** Text-only sections — opacity fade is fine without images */
export const fadeInView = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { duration: 1.05, ease: softEase },
}

export const fadeIn = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.05, ease: softEase },
}

export const fadeInDelayed = (delay = 0) => ({
  ...fadeIn,
  transition: { ...fadeIn.transition, delay },
})
