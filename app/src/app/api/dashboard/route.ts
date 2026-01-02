import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get tasks completed in this workspace
    const { data: completedTasks, error: completedError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('is_completed', true);

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }

    // Get time logged (sum duration from time_entries)
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('duration')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (timeError) {
      return NextResponse.json({ error: timeError.message }, { status: 500 });
    }

    const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
    const tasksCompleted = completedTasks?.length || 0;

    // Get active tasks in this workspace
    const { data: activeTasks, error: activeError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('is_completed', false);

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    const activeTasksCount = activeTasks?.length || 0;

    // Calculate completion rate
    const completionRate = activeTasksCount + tasksCompleted > 0
      ? Math.round((tasksCompleted / (activeTasksCount + tasksCompleted)) * 100)
      : 0;

    // Get tasks due today or overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: upcomingTasks, error: upcomingError } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(10);

    if (upcomingError) {
      console.error('Error fetching upcoming tasks:', upcomingError);
    }

    return NextResponse.json({
      tasksCompleted,
      timeLogged: Math.round(totalTimeLogged / 3600), // Convert seconds to hours
      activeTasks: activeTasksCount,
      completionRate,
      dueToday: upcomingTasks || [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
