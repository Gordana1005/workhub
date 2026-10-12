import { redirect } from 'next/navigation'
import { createSupabaseServer, getAuthUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createSupabaseServer()
  const user = await getAuthUser(supabase)

  if (user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (profile?.username) {
      redirect('/dashboard')
    } else {
      redirect('/auth/onboarding')
    }
  } else {
    redirect('/auth/login')
  }
}
