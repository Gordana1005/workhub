import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js';
import { runTopLevel } from '@/lib/subtasks';
import { ServerTimer } from '@/lib/server-timing';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const timer = new ServerTimer();
    const user = await timer.time('auth', getAuthUser());
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Everything below is independent of each other (the project filter is an inner join, not a
    // separate "list project ids" query), so it all runs in ONE round trip alongside the membership check.
    // Tasks are limited to this workspace's projects; subtasks never count as tasks.
    const [{ data: membership }, completed, active, upcoming, { data: timeEntries }] = await timer.time(
      'db',
      Promise.all([
        supabaseAdmin
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single(),
        runTopLevel((topLevel) => {
          let q = supabaseAdmin
            .from('tasks')
            .select('id, projects!inner(workspace_id)', { count: 'exact', head: true })
            .eq('projects.workspace_id', workspaceId)
            .eq('is_completed', true);
          if (topLevel) q = q.is('parent_task_id', null);
          return q;
        }),
        runTopLevel((topLevel) => {
          let q = supabaseAdmin
            .from('tasks')
            .select('id, projects!inner(workspace_id)', { count: 'exact', head: true })
            .eq('projects.workspace_id', workspaceId)
            .eq('is_completed', false);
          if (topLevel) q = q.is('parent_task_id', null);
          return q;
        }),
        runTopLevel((topLevel) => {
          let q = supabaseAdmin
            .from('tasks')
            .select('*, projects!inner(name, workspace_id)')
            .eq('projects.workspace_id', workspaceId)
            .eq('is_completed', false)
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(10);
          if (topLevel) q = q.is('parent_task_id', null);
          return q;
        }),
        supabaseAdmin
          .from('time_entries')
          .select('duration')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id),
      ])
    );

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tasksCompleted = completed.count || 0;
    const activeTasksCount = active.count || 0;
    const upcomingTasks: any[] = upcoming.data || [];
    const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;

    // Calculate completion rate
    const completionRate = activeTasksCount + tasksCompleted > 0
      ? Math.round((tasksCompleted / (activeTasksCount + tasksCompleted)) * 100)
      : 0;

    return timer.apply(NextResponse.json({
      tasksCompleted,
      timeLogged: Math.round(totalTimeLogged / 3600), // Convert seconds to hours
      activeTasks: activeTasksCount,
      completionRate,
      dueToday: upcomingTasks,
    }));
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
