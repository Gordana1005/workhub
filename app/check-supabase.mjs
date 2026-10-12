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

const env = loadEnv(new URL('./.env.local', import.meta.url))
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking Supabase Connection...\n')

// Check auth users
const { data: users, error: authError } = await supabase.auth.admin.listUsers()
if (authError) {
  console.log('❌ Auth Error:', authError.message)
} else {
  console.log(`✅ Auth Connection: ${users.users.length} users found`)
}

// Check all tables
const tables = ['profiles', 'workspaces', 'workspace_members', 'invitations', 'projects', 'tasks', 'subtasks', 'time_entries', 'notes']
const results = {}

console.log('\n📊 Database Tables Status:\n')

for (const table of tables) {
  try {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      results[table] = { status: '❌', exists: false, error: error.message }
      console.log(`❌ ${table.padEnd(20)} - Missing or No Access`)
    } else {
      results[table] = { status: '✅', exists: true, count: count || 0 }
      console.log(`✅ ${table.padEnd(20)} - ${count || 0} records`)
    }
  } catch (err) {
    results[table] = { status: '❌', exists: false, error: err.message }
    console.log(`❌ ${table.padEnd(20)} - Error`)
  }
}

const existingTables = Object.values(results).filter(r => r.exists).length
const totalTables = tables.length

console.log('\n📈 Summary:')
console.log(`   Tables Deployed: ${existingTables}/${totalTables}`)

if (existingTables === totalTables) {
  console.log('\n✅ DATABASE READY: All tables are deployed and accessible!')
} else if (existingTables === 0) {
  console.log('\n⚠️  DATABASE EMPTY: No tables found. You need to run the schema setup.')
  console.log('\n📝 To deploy the schema:')
  console.log('   1. Go to your Supabase Dashboard: https://app.supabase.com')
  console.log('   2. Navigate to SQL Editor')
  console.log('   3. Run the schema from: src/app/api/setup-schema/route.ts')
} else {
  console.log(`\n⚠️  PARTIAL SETUP: ${existingTables} of ${totalTables} tables deployed`)
  console.log('   Missing tables:', tables.filter(t => !results[t].exists).join(', '))
}
