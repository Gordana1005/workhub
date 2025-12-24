// Environment variables with fallbacks for build time
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Runtime validation helper
export function validateEnvironment() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing required environment variables:')
    if (!SUPABASE_URL) console.error('- NEXT_PUBLIC_SUPABASE_URL')
    if (!SUPABASE_ANON_KEY) console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return false
  }
  return true
}
