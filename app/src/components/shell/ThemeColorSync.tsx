'use client'

import { useEffect } from 'react'

// Browser / PWA chrome colours = the shell surface (header) in each theme.
const LIGHT = '#ffffff'
const DARK = '#16191f'

/**
 * Keeps <meta name="theme-color"> in step with the theme the user picked in the app.
 * The viewport export gives per-OS-scheme colours; this overrides them once the app's own
 * light/dark choice (the `dark` class on <html>) differs from the OS setting.
 */
export default function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const color = root.classList.contains('dark') ? DARK : LIGHT
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute('content', color)
        meta.removeAttribute('media')
      })
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return null
}
