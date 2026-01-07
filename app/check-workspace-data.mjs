#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../app/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWorkspaceData() {
  console.log('🔍 Checking workspace data...\n')

  // Check workspaces
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*')

  if (workspacesError) {
    console.error('❌ Error fetching workspaces:', workspacesError)
    return
  }

  console.log(`📁 Found ${workspaces.length} workspace(s):`)
  workspaces.forEach(ws => {
    console.log(`   - ID: ${ws.id}`)
    console.log(`     Name: ${ws.name || '(no name)'}`)
    console.log(`     Category: ${ws.category || '(not set)'}`)
    console.log(`     Color: ${ws.color || '(not set)'}`)
    console.log(`     Owner: ${ws.owner_id}`)
    console.log(`     Created: ${ws.created_at}`)
    console.log('')
  })

  // Check workspace members
  for (const ws of workspaces) {
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*, profiles(email, full_name)')
      .eq('workspace_id', ws.id)

    if (membersError) {
      console.error(`❌ Error fetching members for workspace ${ws.id}:`, membersError)
      continue
    }

    console.log(`👥 Workspace "${ws.name || ws.id}" has ${members.length} member(s):`)
    members.forEach(m => {
      console.log(`   - ${m.profiles?.full_name || m.profiles?.email || m.user_id} (${m.role})`)
    })
    console.log('')

    // Check projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, workspace_id')
      .eq('workspace_id', ws.id)

    if (projectsError) {
      console.error(`❌ Error fetching projects for workspace ${ws.id}:`, projectsError)
      continue
    }

    console.log(`📊 Workspace "${ws.name || ws.id}" has ${projects?.length || 0} project(s):`)
    if (projects && projects.length > 0) {
      projects.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.id})`)
      })
    }
    console.log('')

    // Check tasks across all projects
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id)
      const { count: taskCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)

      if (tasksError) {
        console.error(`❌ Error counting tasks:`, tasksError)
      } else {
        console.log(`✅ Total tasks across all projects: ${taskCount || 0}`)
      }
      console.log('')
    }
  }

  // Check for projects without workspace_id
  const { data: orphanedProjects, error: orphanError } = await supabase
    .from('projects')
    .select('id, name, workspace_id')
    .is('workspace_id', null)

  if (orphanError) {
    console.error('❌ Error checking for orphaned projects:', orphanError)
  } else if (orphanedProjects && orphanedProjects.length > 0) {
    console.log(`\n⚠️  Found ${orphanedProjects.length} project(s) without workspace_id:`)
    orphanedProjects.forEach(p => {
      console.log(`   - ${p.name} (ID: ${p.id})`)
    })
    console.log('\n💡 These projects need to be assigned to a workspace.')
  } else {
    console.log('✅ All projects are assigned to workspaces')
  }
}

checkWorkspaceData()
  .then(() => {
    console.log('\n✨ Check complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
