import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current workspace from query param (optional)
    // If you want to scope stats to a workspace, pass ?workspaceId=xxx
    // Otherwise, stats are for all user's workspaces

    // Get tasks completed
    const { data: completedTasks, error: completedError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('assignee_id', user.id)
      .eq('is_completed', true);

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }

    // Get time logged (sum duration from time_entries)
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('duration')
      .eq('user_id', user.id);

    if (timeError) {
      return NextResponse.json({ error: timeError.message }, { status: 500 });
    }

    const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
    const tasksCompleted = completedTasks?.length || 0;

    // Get active tasks
    const { data: activeTasks, error: activeError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('assignee_id', user.id)
      .eq('is_completed', false);

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    const activeTasksCount = activeTasks?.length || 0;

    // Calculate completion rate
    const completionRate = activeTasksCount + tasksCompleted > 0
      ? Math.round((tasksCompleted / (activeTasksCount + tasksCompleted)) * 100)
      : 0;

    return NextResponse.json({
      tasksCompleted,
      timeLogged: totalTimeLogged,
      activeTasks: activeTasksCount,
      completionRate,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
