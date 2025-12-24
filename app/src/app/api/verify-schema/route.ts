import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check all expected tables
    const expectedTables = ['profiles', 'workspaces', 'workspace_members', 'invitations', 'projects', 'tasks', 'subtasks', 'time_entries', 'notes']
    const results: Record<string, { exists: boolean; recordCount: number; error?: string }> = {}

    for (const table of expectedTables) {
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
          error: err instanceof Error ? err.message : 'Table does not exist or access denied'
        }
      }
    }

    const existingTables = Object.keys(results).filter(table => results[table].exists)
    const missingTables = Object.keys(results).filter(table => !results[table].exists)

    return NextResponse.json({
      success: true,
      totalExpected: expectedTables.length,
      existingCount: existingTables.length,
      missingCount: missingTables.length,
      existingTables,
      missingTables,
      tableDetails: results,
      databaseReady: missingTables.length === 0,
      nextStep: missingTables.length === 0
        ? 'Database complete! Ready to implement features'
        : 'Some tables still missing - check schema execution'
    })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}