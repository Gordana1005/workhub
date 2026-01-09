import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from './logger';

// Create a service role client to bypass RLS for membership checks
// This is necessary because workspace_members RLS might be restrictive (infinite recursion issues)
// security: We primarily rely on specific checks here, not RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  workspaceId: string;
  userRole: 'admin' | 'member';
}

/**
 * Require authentication for API routes
 * Returns either auth context or error response
 */
export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {}, // No need to set in API routes
        remove() {},
      },
    }
  );
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.warn('Unauthorized API access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get workspace from request (query param or body)
  const url = new URL(request.url);
  let workspaceId = url.searchParams.get('workspace_id') || url.searchParams.get('workspaceId');
  
  // Try to get from body if not in query
  if (!workspaceId) {
    try {
      const body = await request.clone().json();
      workspaceId = body.workspace_id || body.workspaceId;
    } catch {
      // Body parsing failed or not JSON
    }
  }

  if (!workspaceId) {
    logger.warn('API request missing workspace_id', { userId: user.id });
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
  }

  // Check workspace membership
  // use supabaseAdmin to bypass RLS policies on workspace_members table
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    logger.warn('User not member of workspace', { 
      userId: user.id, 
      workspaceId 
    });
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  logger.info('API request authenticated', {
    userId: user.id,
    workspaceId,
    role: membership.role
  });

  return {
    user: { id: user.id, email: user.email! },
    workspaceId,
    userRole: membership.role as 'admin' | 'member',
  };
}

/**
 * Require admin role for API routes
 * Returns either auth context or error response
 */
export async function requireAdmin(request: Request): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  if (authResult.userRole !== 'admin') {
    logger.warn('Non-admin attempted admin action', {
      userId: authResult.user.id,
      workspaceId: authResult.workspaceId
    });
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return authResult;
}

/**
 * Optionally require authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(request: Request): Promise<{ user: { id: string; email: string } } | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return {
    user: { id: user.id, email: user.email! }
  };
}
