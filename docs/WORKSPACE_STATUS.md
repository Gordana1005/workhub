# Workhub – Current State and Implementation Guide

This document captures how the app works today, what data flows and APIs exist, and what remains to finish. It is meant to prevent regressions and serve as a handoff for future work.

## Stack and Architecture
- Framework: Next.js 14 (App Router) with TypeScript.
- Styling: Tailwind CSS; custom UI components in `app/src/components/ui`.
- State: Zustand stores (e.g., `useWorkspaceStore`, `useTimerStore`).
- Backend: Supabase Postgres/Auth; RLS in place; server routes under `app/src/app/api/*` using Supabase service role where needed.
- Realtime: Supabase channels for notifications and profile/avatar updates.
- Editors: TipTap for notes (hydration fixes applied).

## Key Features and Flows
### Workspaces and Navigation
- Workspace switcher in Topbar; Sidebar/Topbar navigation covers Dashboard, Projects, Tasks, Plans, Notes, Workspaces, Time, Team, Finance, Reports, Webhooks.
- Mobile: Sidebar toggle via Topbar menu.
- Focus Mode quick link in Topbar.

### Authentication and Profile
- Supabase Auth. Profile data in `profiles` table (`id`, `full_name`, `email`, `avatar_url`, etc.).
- Settings page lets users pick an avatar (DiceBear URLs). Topbar avatar listens to profile changes via Supabase channel and updates when avatar changes.

### Notifications
- Notification bell opens `NotificationCenter`; unread badge count from `/api/notifications?unread_only=true`.
- Realtime subscription to `notifications` table for inserts; supports marking read, mark-all-read, and delete.
- Bell currently uses global notifications (workspace id not enforced in UI; API handles filtering where applicable).

### Tasks
- API: `/api/tasks` uses Supabase service role. Requires `workspace_id`; enforces `project_id` on create; defaults `assignee_id` to current user if missing. Returns project color and assignee info.
- DB hotfix script exists to add `tasks.user_id`, backfill from `assignee_id`, and add trigger/index (`database/fix-tasks-user-id.sql`). Ensure it is applied in Supabase.
- Tasks page (`/dashboard/tasks`):
  - Views: List, Board (Kanban), Calendar.
  - Quick selectors for project and assignee feed into Task creation modal (`TaskDetailModal`) via `initialProjectId`/`initialAssigneeId`.
  - List view shows project color border/dot, priority pill, assignee, due date. Neutral slate color used when no project to avoid purple fallback.
  - Kanban cards show project color/dot, project name, assignee, priority; status drag/drop updates via API.
  - Calendar opens edit modal on click.
  - Bulk actions: complete, delete, change priority.
  - Templates: template selector to prefill modal.
- Dashboard quick-add:
  - Input + project/assignee selectors (dark themed). Inserts task with selected project and assignee (or current user) into Supabase and prepends to “My Tasks”.
  - “My Tasks” card list shows project color border/dot + assignee.
- My Tasks widget (dashboard) filters tasks for the current user (assignee), colors by project.

### Notes
- Notes page lists notes per workspace or filtered by project. Notes now open editor on card click (no need to hit Edit).
- Create/Update/Delete via `/api/notes`; supports project scoping and tags.
- TipTap editor configured with SSR-safe hydration (in `components/notes/RichTextEditor.tsx`).

### Projects
- Projects list/grid on dashboard; active projects shown with color tile and link.
- Color is used across tasks and UI badges.

### Time Tracker
- Timer state in Zustand (`useTimerStore`), start/stop on dashboard widget; entries stored in `time_entries` (today’s summary shown).

### Other UI/UX
- Navigation refactor completed (Topbar desktop links, mobile sidebar).
- Console hydration issues with TipTap resolved.
- Bulk export dialog for tasks; advanced filters available.

## Data Model Highlights (Supabase/Postgres)
- `profiles`: user profile, `avatar_url`, `full_name`, etc. Used for assignee names and avatar.
- `workspaces`: tenant container; `workspace_id` present on all major tables.
- `projects`: includes `color`, `status`; joined into tasks and notes.
- `tasks` (key fields): `id`, `workspace_id`, `project_id` (required by API), `assignee_id`, `user_id` (hotfix adds), `title`, `description`, `priority`, `status`, `is_completed`, `due_date`, `completed_at`. Index/trigger from hotfix for `user_id` sync.
- `notifications`: used by NotificationCenter; unread/read status; link handling in UI.
- `notes`: `project_id` (workspace comes via project join), `title`, `content`, tags; author info available from profiles via API.
- `time_entries`: `duration`, `date`, `workspace_id`.

## Files of Interest
- UI/Layouts: `app/src/components/layout/Topbar.tsx`, `Sidebar.tsx`, `app/src/app/dashboard/layout.tsx`.
- Tasks: `app/src/app/dashboard/tasks/page.tsx`, `app/src/components/tasks/TaskDetailModal.tsx`, `KanbanBoard.tsx`, `KanbanCard.tsx`, `components/tasks/types.ts`, API `app/src/app/api/tasks/route.ts`.
- Dashboard widgets: `app/src/app/dashboard/page.tsx` (quick add, My Tasks, Active Projects, Time tracker).
- Notes: `app/src/app/dashboard/notes/page.tsx`, `components/notes/NotesList.tsx`, `NoteCard.tsx`, `NoteEditor.tsx`.
- Notifications: `components/notifications/NotificationCenter.tsx`, Topbar bell hookup.
- Profile/Settings: `app/src/app/dashboard/settings/page.tsx`, Avatar component `components/ui/Avatar.tsx`.
- DB scripts: `database/fix-tasks-user-id.sql` (apply), `database/update-schema.sql`, migration files under `database/migrations/*`.

## Current UX Requirements Implemented
- Task creation requires project/assignee; quick selectors propagate to modal.
- Project colors visible in list, board, and widgets; neutral color when no project to avoid ambiguous purple.
- Notes open on card click; edit/delete buttons remain.
- Mobile dashboard quick-add aligns project/assignee selectors on one row; blue Add button; shortened placeholder fits small screens.
- Notification bell opens center; unread badge works; avatar in Topbar reflects chosen profile avatar.

## Gaps / Pending Work
1) **Apply DB hotfix**: Run `database/fix-tasks-user-id.sql` on Supabase to ensure `tasks.user_id` exists/backfilled and trigger/index applied. Without it, legacy PGRST204 errors may recur for filters on `user_id`.
2) **Verify lint/typecheck/build**: Run project lint/tsc/build to surface remaining console/type errors after recent UI changes.
3) **Notifications scoping**: Confirm API enforces workspace scoping and consider showing workspace filter in NotificationCenter if needed.
4) **Avatar caching**: Topbar now listens for profile updates; still confirm CDN caching doesn’t delay avatar render in production.
5) **Accessibility/Theme**: Form selects were darkened via inline styles—consider a reusable dark select style for consistency.
6) **Hot paths testing**: Task create/edit across list/board/calendar, quick-add, template flow; Notes CRUD; Workspace switcher; mobile nav.

## How To Extend Safely
- When adding Task fields, update: API (`/api/tasks`), types (`components/tasks/types.ts` and page-level Task interfaces), and all renderers (list, Kanban, modal, calendar).
- Preserve project color wiring: board (`KanbanCard`), list cards, widgets, badges.
- For new notification types, add icon/color mapping in `NotificationCenter` and ensure API returns `type`, `title`, `message`, `link`.
- For avatar/profile changes, keep Supabase channel subscription and re-fetch logic in Topbar.
- Notes: keep card click opening editor; ensure API includes project/workspace filtering.

## Next Steps (recommended)
1. Apply `database/fix-tasks-user-id.sql` on Supabase.
2. Run lint + typecheck + build; fix any errors/warnings.
3. QA mobile: dashboard quick-add, My Tasks, Task modal, navigation.
4. QA notifications end-to-end: create a sample notification, confirm bell badge increments, panel loads, and mark-as-read works.
5. Consider consolidating select styling into a shared component and removing inline styles once stabilized.
