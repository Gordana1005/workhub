import { useEffect, useState } from 'react'

export interface KeyboardViewport {
  /** Visible height (px) while the on-screen keyboard is open. */
  height: number
  /** Distance (px) from the top of the layout viewport to the visible area (iOS scrolls it). */
  top: number
  /** Height (px) covered by the keyboard. */
  inset: number
}

/**
 * Tracks the on-screen keyboard through `visualViewport`.
 * Returns null while no keyboard is open (or when unsupported / inactive), so full-screen
 * sheets only override their height when the keyboard really covers the bottom of the page.
 */
export function useVisualViewport(active = true): KeyboardViewport | null {
  const [state, setState] = useState<KeyboardViewport | null>(null)

  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      // small differences are browser chrome (URL bar), not a keyboard
      if (inset < 100 && vv.offsetTop < 1) {
        setState((prev) => (prev === null ? prev : null))
        return
      }
      setState({ height: Math.round(vv.height), top: Math.round(vv.offsetTop), inset })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setState(null)
    }
  }, [active])

  return state
}
