import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 },
        { status: 200 }
      )
    }

    // Get all tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
    
    // Get time entries
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .eq('user_id', user.id)
    
    const totalHours = timeEntries?.reduce((sum, entry) => 
      sum + (entry.duration / 3600), 0
    ) || 0
    
    const completed = tasks?.filter(t => t.is_completed).length || 0
    const total = tasks?.length || 0
    const active = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return NextResponse.json({
      tasksCompleted: completed,
      timeLogged: Math.round(totalHours),
      activeTasks: active,
      completionRate
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 },
      { status: 200 }
    )
  }
}
