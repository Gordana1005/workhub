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
const password = 'admin123'

// Check if user exists first
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

if (listError) {
  console.log('❌ Error listing users:', listError.message)
  process.exit(1)
}

const existingUser = users.find(u => u.email === email)
let userId

if (existingUser) {
  console.log('🔄 User exists, updating password...')
  userId = existingUser.id
  
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    { password: password, email_confirm: true }
  )
  
  if (updateError) {
    console.log('❌ Error updating user:', updateError.message)
    process.exit(1)
  }
} else {
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
  userId = data.user.id
}

console.log('✅ User created/updated successfully!')
console.log('\n📧 Login credentials:')
console.log(`   Email: ${email}`)
console.log(`   Password: ${password}`)
console.log(`   User ID: ${userId}`)

// Create profile entry
const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    id: userId,
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
