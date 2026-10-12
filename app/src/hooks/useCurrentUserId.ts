import { useEffect, useState } from 'react'
import { getSessionUser } from '@/lib/auth-client'

/** The signed-in user's id ('' until it is known). */
export function useCurrentUserId(): string {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    let cancelled = false
    // local session, no network round trip
    getSessionUser().then((user) => {
      if (!cancelled && user) setUserId(user.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return userId
}
