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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = searchParams.get('workspaceId');

    let query = supabase
      .from('notes')
      .select(`
        *,
        project:projects(name, workspace_id),
        author:profiles(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (workspaceId) {
      query = query.eq('project.workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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

    // Insert the note
    const { data, error } = await supabase
      .from('notes')
      .insert({
        project_id,
        author_id: user.id,
        title,
        content: content || '',
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
        // First, ensure all tags exist and get their IDs
        const tagIds: string[] = [];
        
        for (const tag of tags) {
          // Upsert tag
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .upsert(
              { 
                name: tag.name, 
                workspace_id: tag.workspace_id, 
                color: tag.color || '#667eea' 
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

        // Then create note_tags associations with the actual tag IDs
        if (tagIds.length > 0) {
          const noteTagsData = tagIds.map(tagId => ({
            note_id: data.id,
            tag_id: tagId
          }));

          const { error: noteTagsError } = await supabase
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

    // Update the note
    const { data, error } = await supabase
      .from('notes')
      .update({ title, content })
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle tags if provided
    if (tags && Array.isArray(tags)) {
      try {
        // First, delete existing note_tags
        await supabase
          .from('note_tags')
          .delete()
          .eq('note_id', id);

        // Then create new associations if there are tags
        if (tags.length > 0) {
          const tagIds: string[] = [];
          
          // Ensure all tags exist and get their IDs
          for (const tag of tags) {
            const { data: tagData, error: tagError } = await supabase
              .from('tags')
              .upsert(
                { 
                  name: tag.name, 
                  workspace_id: tag.workspace_id, 
                  color: tag.color || '#667eea' 
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

            const { error: noteTagsError } = await supabase
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

    const { error } = await supabase
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
