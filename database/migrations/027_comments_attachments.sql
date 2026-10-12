-- 027: task comments (edit marker) + task attachments (table + private storage bucket)
-- Idempotent: safe to run more than once. Run in the Supabase SQL editor as the project owner
-- (creating storage buckets / storage policies needs owner rights).
--
-- The app degrades gracefully while this has not been run: comments still work, "edited" is
-- simply not shown, and the Files tab says that attachments are not set up yet.

create extension if not exists "uuid-ossp";

-- 1) Comments: edit marker -----------------------------------------------------------------
-- The API sets updated_at when a comment is edited; the UI shows "edited" when it is later
-- than created_at.
do $$
begin
  if to_regclass('public.task_notes') is not null then
    alter table public.task_notes add column if not exists updated_at timestamptz default now();
    create index if not exists idx_task_notes_task_created on public.task_notes (task_id, created_at);
  end if;
end $$;

-- 2) Attachment metadata (same shape as 016_file_attachments.sql) ---------------------------
create table if not exists public.file_attachments (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    task_id uuid references public.tasks(id) on delete cascade,
    project_id uuid references public.projects(id) on delete cascade,
    note_id uuid references public.notes(id) on delete cascade,
    file_name text not null,
    file_type text,
    file_size bigint,
    storage_path text not null unique,
    version integer not null default 1,
    uploaded_by uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint file_attachments_target_check check (
        task_id is not null or project_id is not null or note_id is not null
    )
);

create index if not exists idx_file_attachments_workspace on public.file_attachments(workspace_id);
create index if not exists idx_file_attachments_task on public.file_attachments(task_id) where task_id is not null;
create index if not exists idx_file_attachments_uploaded_by on public.file_attachments(uploaded_by);

alter table public.file_attachments enable row level security;

drop policy if exists "Members can view attachments" on public.file_attachments;
create policy "Members can view attachments" on public.file_attachments
    for select using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
        and deleted_at is null
    );

-- 3) Private storage bucket for the files ---------------------------------------------------
-- Files are uploaded through signed upload URLs and read through signed download URLs that the
-- API creates with the service role, so the bucket stays private. 10 MB per file.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('attachments', 'attachments', false, 10485760)
  on conflict (id) do nothing;

  -- a bucket created earlier without a limit gets the limit too
  update storage.buckets
     set file_size_limit = 10485760
   where id = 'attachments' and file_size_limit is null;
exception
  when insufficient_privilege then
    raise notice 'Could not create the attachments bucket: run this migration as the project owner (or create a private bucket named "attachments" with a 10 MB limit in Storage).';
end $$;

-- Defence in depth: signed-in users can only read objects of workspaces they belong to
-- (object keys look like <workspace_id>/<task_id>/<uuid>-<file name>). All writes go through
-- the API, so no insert/update/delete policies are created.
do $$
begin
  drop policy if exists "Members can read workspace attachments" on storage.objects;
  create policy "Members can read workspace attachments" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'attachments'
      and exists (
        select 1 from public.workspace_members wm
        where wm.user_id = auth.uid()
          and wm.workspace_id::text = (storage.foldername(name))[1]
      )
    );
exception
  when insufficient_privilege then
    raise notice 'Could not create the storage policy: run this migration as the project owner.';
end $$;
