import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Simple test - try to get auth users (this should work with service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: authError.message,
        env_check: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }, { status: 500 })
    }

    // Try a simple query on a common table that might exist
    const tablesToCheck = ['profiles', 'workspaces', 'projects', 'tasks']
    const results: Record<string, { exists: boolean; recordCount: number; error?: string }> = {}

    for (const table of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        results[table] = {
          exists: !error,
          recordCount: count || 0,
          error: error?.message
        }
      } catch (err) {
        results[table] = {
          exists: false,
          recordCount: 0,
          error: err instanceof Error ? err.message : 'Table does not exist'
        }
      }
    }

    return NextResponse.json({
      connection: 'successful',
      authUsersCount: authUsers?.users?.length || 0,
      tableCheck: results,
      recommendation: Object.values(results).some(r => r.exists && r.recordCount > 0)
        ? 'Database has existing data - review before running schema'
        : 'Database appears empty or missing tables - safe to run schema'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}