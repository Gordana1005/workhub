import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants'

export const supabase = createBrowserClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
