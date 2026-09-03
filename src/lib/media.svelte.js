// Reactive viewport flags. `narrow` mirrors the phone breakpoint used by the
// stylesheets, for the few places where the phone layout needs different
// markup rather than different CSS.
const PHONE = '(max-width: 560px)'
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PHONE) : null

export const viewport = $state({ narrow: mq?.matches ?? false })

mq?.addEventListener('change', (e) => {
  viewport.narrow = e.matches
})
