# Bug Fixes - January 2, 2026

## Issues Fixed

### 1. Tasks Not Showing in Tasks Page ✅
**Problem**: Tasks tab showed "No tasks yet" even though tasks existed in the database.

**Root Cause**: Incorrect Supabase query syntax for foreign key joins. Was using `project:projects(name)` instead of `project:projects!project_id(name)`.

**Fix**: Updated query in `app/src/app/dashboard/tasks/page.tsx` to use proper foreign key relationship syntax:
```typescript
.select(`
  *,
  project:projects!project_id(name),
  assignee:profiles!assignee_id(full_name)
`)
```

### 2. Tasks Not Showing in Project Detail Page ✅
**Problem**: Project page showed "No tasks yet" for projects that had tasks.

**Root Cause**: Same foreign key join syntax issue.

**Fix**: Updated query in `app/src/app/dashboard/projects/[id]/page.tsx`:
```typescript
.select(`
  *,
  assignee:profiles!assignee_id(full_name)
`)
```

### 3. Hydration Errors in WorkspaceSwitcher ✅
**Problem**: Console showed "Text content did not match" errors for workspace name display.

**Root Cause**: Server-side render and client-side render differed because workspace store loaded client-side only.

**Fix**: Added mounted state to prevent hydration mismatch in `app/src/components/layout/WorkspaceSwitcher.tsx`:
```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

// Then in JSX:
{mounted ? (currentWorkspace?.name || 'Select Workspace') : 'Loading...'}
```

### 4. Better Error Handling ✅
**Problem**: Errors in data loading could crash pages.

**Fix**: Added try-catch blocks and proper error logging, set empty arrays on error instead of throwing.

## Testing Checklist

- [ ] Navigate to Tasks tab - should show all tasks from current workspace
- [ ] Click into a project - should show tasks for that project
- [ ] Check browser console - no hydration errors
- [ ] Focus mode - should list available tasks
- [ ] Notes - can create/view notes (after running SQL policies)

## Notes

The Supabase foreign key join syntax requires the `!` operator to specify which foreign key relationship to use:
- Format: `related_table!foreign_key_column(columns_to_select)`
- Example: `project:projects!project_id(name)` means "join projects table using project_id foreign key"

This is because a table might have multiple foreign keys pointing to the same table.
