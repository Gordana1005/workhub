import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sanitizeHtml } from '@/lib/sanitize-html';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

// Admin client for bypassing RLS
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId');

    // Resolve the workspace that must be checked: an explicit workspace_id,
    // or the workspace that owns the requested project.
    let accessWorkspaceId = workspaceId;
    if (projectId) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('workspace_id')
        .eq('id', projectId)
        .single();

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (workspaceId && workspaceId !== project.workspace_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      accessWorkspaceId = project.workspace_id;
    }

    // Verify workspace access
    if (accessWorkspaceId) {
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', accessWorkspaceId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    let query = supabaseAdmin
      .from('notes')
      .select(`
        *,
        project:projects(name, workspace_id),
        author:profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach real tags (non-fatal if the tag tables are unavailable)
    let notes: any[] = data || [];
    try {
      const ids = notes.map((n) => n.id);
      if (ids.length > 0) {
        const { data: links } = await supabaseAdmin
          .from('note_tags')
          .select('note_id, tag_id')
          .in('note_id', ids);
        const tagIds = Array.from(new Set((links || []).map((l: any) => l.tag_id)));
        const { data: tagRows } = tagIds.length > 0
          ? await supabaseAdmin
              .from('tags')
              .select('id, name, color, workspace_id')
              .in('id', tagIds)
          : { data: [] as any[] };
        const byId = new Map((tagRows || []).map((tg: any) => [tg.id, tg]));
        notes = notes.map((n) => ({
          ...n,
          tags: (links || [])
            .filter((l: any) => l.note_id === n.id)
            .map((l: any) => byId.get(l.tag_id))
            .filter(Boolean),
        }));
      }
    } catch (tagError) {
      console.error('Error loading note tags:', tagError);
    }

    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { project_id, title, content, tags } = body;

    if (!project_id || !title) {
      return NextResponse.json(
        { error: 'project_id and title are required' },
        { status: 400 }
      );
    }

    // Get workspace_id from project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('workspace_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify workspace access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Insert the note with workspace_id
    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        project_id,
        workspace_id: project.workspace_id,
        author_id: user.id,
        title,
        content: sanitizeHtml(content),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0 && data) {
      try {
        // Use existing tag IDs or create new tags
        const tagIds: string[] = [];
        
        for (const tag of tags) {
          // If tag already has an ID, use it directly
          if (tag?.id) {
            // Only reuse a tag that belongs to this workspace
            const { data: ownTag } = await supabaseAdmin
              .from('tags')
              .select('id')
              .eq('id', tag.id)
              .eq('workspace_id', project.workspace_id)
              .maybeSingle();
            if (ownTag?.id) tagIds.push(ownTag.id);
          } else {
            const tagName = typeof tag?.name === 'string' ? tag.name.trim().slice(0, 50) : '';
            if (!tagName) continue;
            const tagColor = typeof tag.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(tag.color) ? tag.color : '#667eea';
            // Create new tag
            const { data: tagData, error: tagError } = await supabaseAdmin
              .from('tags')
              .upsert(
                { 
                  name: tagName, 
                  workspace_id: project.workspace_id, 
                  color: tagColor 
                },
                { onConflict: 'workspace_id,name' }
              )
              .select('id')
              .single();
            
            if (tagError) {
              console.error('Error creating tag:', tagError);
              continue;
            }

            if (tagData?.id) {
              tagIds.push(tagData.id);
            }
          }
        }

        // Then create note_tags associations with the actual tag IDs
        if (tagIds.length > 0) {
          const noteTagsData = tagIds.map(tagId => ({
            note_id: data.id,
            tag_id: tagId
          }));

          const { error: noteTagsError } = await supabaseAdmin
            .from('note_tags')
            .insert(noteTagsData);

          if (noteTagsError) {
            console.error('Error associating tags with note:', noteTagsError);
            // Don't fail the whole request if tags fail
          }
        }
      } catch (tagError) {
        console.error('Error handling tags:', tagError);
        // Don't fail the whole request if tags fail
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in POST /api/notes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json();
    const { id, title, content, tags } = body;

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Update the note (content is sanitized on write)
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = sanitizeHtml(content);

    const { data, error } = await supabaseAdmin
      .from('notes')
      .update(update)
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      console.error('Error updating note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The workspace always comes from the note itself, never from the client
    let noteWorkspaceId: string | null = data?.workspace_id ?? null;
    if (!noteWorkspaceId && data?.project_id) {
      const { data: noteProject } = await supabaseAdmin
        .from('projects')
        .select('workspace_id')
        .eq('id', data.project_id)
        .maybeSingle();
      noteWorkspaceId = noteProject?.workspace_id ?? null;
    }

    // Handle tags if provided
    if (tags && Array.isArray(tags) && noteWorkspaceId) {
      try {
        // First, delete existing note_tags
        await supabaseAdmin
          .from('note_tags')
          .delete()
          .eq('note_id', id);

        // Then create new associations if there are tags
        if (tags.length > 0) {
          const tagIds: string[] = [];
          
          // Ensure all tags exist and get their IDs
          for (const tag of tags) {
            const tagName = typeof tag?.name === 'string' ? tag.name.trim().slice(0, 50) : '';
            if (!tagName) continue;
            const tagColor = typeof tag.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(tag.color) ? tag.color : '#667eea';
            const { data: tagData, error: tagError } = await supabaseAdmin
              .from('tags')
              .upsert(
                { 
                  name: tagName, 
                  workspace_id: noteWorkspaceId, 
                  color: tagColor 
                },
                { onConflict: 'workspace_id,name' }
              )
              .select('id')
              .single();
            
            if (tagError) {
              console.error('Error creating tag:', tagError);
              continue;
            }

            if (tagData?.id) {
              tagIds.push(tagData.id);
            }
          }

          // Create note_tags associations with the actual tag IDs
          if (tagIds.length > 0) {
            const noteTagsData = tagIds.map(tagId => ({
              note_id: id,
              tag_id: tagId
            }));

            const { error: noteTagsError } = await supabaseAdmin
              .from('note_tags')
              .insert(noteTagsData);

            if (noteTagsError) {
              console.error('Error associating tags with note:', noteTagsError);
            }
          }
        }
      } catch (tagError) {
        console.error('Error handling tags:', tagError);
        // Don't fail the whole request if tags fail
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in PUT /api/notes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
