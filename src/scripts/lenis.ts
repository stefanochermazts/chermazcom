const REDUCE_KEY = 'prefersReducedMotionUser'

try {
  const userPrefRaw = localStorage.getItem(REDUCE_KEY)
  const userPref = userPrefRaw === 'true' ? true : userPrefRaw === 'false' ? false : null
  const reduce = userPref !== null ? userPref : window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!reduce) {
    ;(async () => {
      const { default: Lenis } = await import('lenis')
      let lenis: any = new Lenis({
        duration: 0.6,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1.25,
      })
      let running = true
      function raf(time: number) {
        if (!running || !lenis) return
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)

      window.addEventListener('reduce-motion-changed', (e: any) => {
        const v = !!(e && e.detail && e.detail.value)
        if (v) {
          running = false
          try { lenis?.destroy?.() } catch {}
          lenis = null
        } else {
          if (!lenis) {
            lenis = new Lenis({
              duration: 0.6,
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              smoothWheel: true,
              smoothTouch: false,
              wheelMultiplier: 1.25,
            })
          }
          running = true
          requestAnimationFrame(raf)
        }
      })
    })()
  }
} catch {}


