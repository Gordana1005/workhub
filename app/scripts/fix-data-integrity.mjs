
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

function loadEnv(path) {
  const out = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

const env = loadEnv(new URL('../.env.local', import.meta.url))
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

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
