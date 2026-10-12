import { useEffect, useState } from 'react'

/**
 * Tracks a CSS media query. Returns `false` on the server and on the first client render
 * (so markup always matches hydration), then the live value.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}
