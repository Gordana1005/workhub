import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Verify user has access to this workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get projects in this workspace first
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId);

    const projectIds = projects?.map(p => p.id) || [];

    let tasksCompleted = 0;
    let activeTasksCount = 0;
    let upcomingTasks: any[] = [];

    if (projectIds.length > 0) {
      // Get tasks completed in projects of this workspace
      const { count: completedCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_completed', true);

      tasksCompleted = completedCount || 0;

      // Get active tasks
      const { count: activeCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_completed', false);

      activeTasksCount = activeCount || 0;

      // Get upcoming tasks
      const { data: upcoming } = await supabaseAdmin
        .from('tasks')
        .select('*, projects(name, workspace_id)')
        .in('project_id', projectIds)
        .eq('is_completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      upcomingTasks = upcoming || [];
    }

    // Get time logged
    const { data: timeEntries } = await supabaseAdmin
      .from('time_entries')
      .select('duration')
      .eq('user_id', user.id);

    // Filter time entries by workspace if they have workspace_id or project relation
    const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;

    // Calculate completion rate
    const completionRate = activeTasksCount + tasksCompleted > 0
      ? Math.round((tasksCompleted / (activeTasksCount + tasksCompleted)) * 100)
      : 0;

    return NextResponse.json({
      tasksCompleted,
      timeLogged: Math.round(totalTimeLogged / 3600), // Convert seconds to hours
      activeTasks: activeTasksCount,
      completionRate,
      dueToday: upcomingTasks,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
