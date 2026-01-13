-- File attachments schema for tasks/projects/notes
-- Adds metadata table with soft-delete and RLS for workspace members

create table if not exists file_attachments (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    task_id uuid references tasks(id) on delete cascade,
    project_id uuid references projects(id) on delete cascade,
    note_id uuid references notes(id) on delete cascade,
    file_name text not null,
    file_type text,
    file_size bigint,
    storage_path text not null unique,
    version integer not null default 1,
    uploaded_by uuid references profiles(id),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint file_attachments_target_check check (
        task_id is not null or project_id is not null or note_id is not null
    )
);

create index if not exists idx_file_attachments_workspace on file_attachments(workspace_id);
create index if not exists idx_file_attachments_task on file_attachments(task_id) where task_id is not null;
create index if not exists idx_file_attachments_project on file_attachments(project_id) where project_id is not null;
create index if not exists idx_file_attachments_note on file_attachments(note_id) where note_id is not null;
create index if not exists idx_file_attachments_uploaded_by on file_attachments(uploaded_by);

alter table file_attachments enable row level security;

-- Workspace members can view attachments scoped to their workspace
drop policy if exists "Members can view attachments" on file_attachments;
create policy "Members can view attachments" on file_attachments
    for select using (
        exists (
            select 1 from workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
        and deleted_at is null
    );

-- Members can insert attachments for their workspace
drop policy if exists "Members can insert attachments" on file_attachments;
create policy "Members can insert attachments" on file_attachments
    for insert with check (
        exists (
            select 1 from workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
    );

-- Members can update attachment metadata within their workspace (e.g., soft delete)
drop policy if exists "Members can update attachments" on file_attachments;
create policy "Members can update attachments" on file_attachments
    for update using (
        exists (
            select 1 from workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
    );

-- Members can delete (soft delete) attachments in their workspace
drop policy if exists "Members can delete attachments" on file_attachments;
create policy "Members can delete attachments" on file_attachments
    for delete using (
        exists (
            select 1 from workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
    );
