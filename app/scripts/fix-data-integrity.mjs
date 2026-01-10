
import { createClient } from '@supabase/supabase-js'

// Load env vars
const supabaseUrl = 'https://miqwspnfqdqrwkdqviif.supabase.co'
const supabaseServiceKey = 'sb_secret_fbfukuUsJcMb1BwXCO6C0g_bZBYI0E7'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMissingProfiles() {
  console.log('🔍 Checking for missing profiles...')

  // 1. Get all users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Failed to list users:', usersError)
    return
  }

  console.log(`Found ${users.length} users in Auth system.`)

  let fixedCount = 0

  for (const user of users) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
        console.log(`⚠️  Missing profile for: ${user.email} (${user.id})`)
        console.log(`   Creating profile...`)

        const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                avatar_url: user.user_metadata?.avatar_url,
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error(`   ❌ Failed to create profile: ${insertError.message}`)
        } else {
            console.log(`   ✅ Profile created successfully!`)
            fixedCount++
        }
    } else {
        // console.log(`✅ Profile exists for: ${user.email}`)
    }
  }

  console.log(`\n🎉 Done! Fixed ${fixedCount} missing profiles.`)
}

fixMissingProfiles()
