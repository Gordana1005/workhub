import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://miqwspnfqdqrwkdqviif.supabase.co'
const supabaseKey = 'sb_secret_fbfukuUsJcMb1BwXCO6C0g_bZBYI0E7'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔐 Creating admin account...\n')

const email = 'admin@admin.com'
const password = 'admin'

// Create user using admin API
const { data, error } = await supabase.auth.admin.createUser({
  email: email,
  password: password,
  email_confirm: true, // Auto-confirm email
  user_metadata: {
    full_name: 'Admin User'
  }
})

if (error) {
  console.log('❌ Error creating user:', error.message)
  process.exit(1)
}

console.log('✅ User created successfully!')
console.log('\n📧 Login credentials:')
console.log(`   Email: ${email}`)
console.log(`   Password: ${password}`)
console.log(`   User ID: ${data.user.id}`)

// Create profile entry
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: data.user.id,
    email: email,
    full_name: 'Admin User',
    job_title: 'Administrator',
    department: 'Management'
  })

if (profileError) {
  console.log('\n⚠️  Profile creation failed:', profileError.message)
  console.log('   You may need to complete onboarding after login')
} else {
  console.log('✅ Profile created successfully!')
}

console.log('\n🚀 You can now login at:')
console.log('   Local: http://localhost:3000/auth/login')
console.log('   Vercel: https://workhub-puce.vercel.app/auth/login')
