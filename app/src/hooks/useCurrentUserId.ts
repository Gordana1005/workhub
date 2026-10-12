import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** The signed-in user's id ('' until it is known). */
export function useCurrentUserId(): string {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) setUserId(data.user.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return userId
}
