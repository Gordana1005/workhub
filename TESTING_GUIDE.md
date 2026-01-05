# 🚀 Quick Start Guide - New Features Testing

## Start the Development Server

```powershell
cd app
npm run dev
```

Then open: http://localhost:3000

---

## ⌨️ Test Keyboard Shortcuts

1. **Open the app**
2. **Press `Ctrl + /` (Windows) or `Cmd + /` (Mac)**
   - Should show keyboard shortcuts help modal
3. **Press `Ctrl + K`**
   - Should open command palette
4. **Type "dashboard" and press Enter**
   - Should navigate to dashboard
5. **Press `N`** (when not in input field)
   - Should trigger new task action
6. **Press `G` then `T`**
   - Should navigate to tasks page

---

## 📅 Test Natural Language Date Parsing

1. **Go to Dashboard** (http://localhost:3000/dashboard)
2. **Find the "Quick Add Task" input**
3. **Type:** "Review PR tomorrow at 3pm"
4. **Press Enter or click Add**
5. **Check the created task** - due date should be tomorrow at 3 PM
6. **Try more examples:**
   - "Team meeting next monday"
   - "Submit report in 2 days"
   - "Call client friday afternoon"

---

## 🎯 Test Command Palette

1. **Press `Ctrl/Cmd + K`** anywhere in the app
2. **Try searching:**
   - Type "new" - shows new task, new project, new note
   - Type "go" - shows all navigation options
   - Type "timer" - shows toggle timer
3. **Navigate with arrow keys**
4. **Press Enter to execute**
5. **Press Esc to close**

---

## 🎴 Test Kanban Board

**Note:** You need to integrate this into the tasks page UI first. Here's how to test the component:

1. Go to `app/src/app/dashboard/tasks/page.tsx`
2. Import and add the KanbanBoard component
3. Add a view switcher (List/Board/Calendar)
4. Test drag and drop between columns

**Quick Integration Example:**
```tsx
import KanbanBoard from '@/components/tasks/KanbanBoard'

// In your component:
const [view, setView] = useState<'list' | 'board' | 'calendar'>('list')

{view === 'board' && (
  <KanbanBoard 
    tasks={tasks}
    onTaskUpdate={async (id, updates) => {
      // Update task in database
      await updateTask(id, updates)
      loadTasks() // Refresh
    }}
    onTaskClick={(task) => {
      // Open task detail modal
      setEditingTask(task)
      setShowEditDialog(true)
    }}
  />
)}
```

---

## 📆 Test Calendar View

**Same as Kanban** - needs UI integration:

```tsx
import CalendarView from '@/components/tasks/CalendarView'

{view === 'calendar' && (
  <CalendarView
    tasks={tasks}
    onTaskClick={(task) => {
      setEditingTask(task)
      setShowEditDialog(true)
    }}
    onDateSelect={(start, end) => {
      // Create new task with selected date
      setFormData({ ...formData, due_date: start.toISOString() })
      setShowCreateDialog(true)
    }}
  />
)}
```

---

## 💬 Test Task Comments

**Needs integration in task detail modal:**

```tsx
import CommentThread from '@/components/tasks/CommentThread'
import { supabase } from '@/lib/supabase'

// Get current user ID
const { data: { user } } = await supabase.auth.getUser()

// In task modal:
<CommentThread 
  taskId={editingTask.id}
  currentUserId={user.id}
/>
```

---

## 📤 Test Data Export

**Needs UI button integration:**

```tsx
import ExportDialog from '@/components/ExportDialog'

const [showExport, setShowExport] = useState(false)

// Add export button to toolbar
<button onClick={() => setShowExport(true)}>
  <Download /> Export
</button>

// Add dialog
<ExportDialog
  isOpen={showExport}
  onClose={() => setShowExport(false)}
  data={tasks}
  dataType="tasks"
  defaultFilename={`tasks-${new Date().toISOString().split('T')[0]}`}
/>
```

---

## 🔍 Test Advanced Filters

**Integration example:**

```tsx
import AdvancedFilter, { TaskFilters } from '@/components/tasks/AdvancedFilter'

const [filters, setFilters] = useState<TaskFilters>({
  status: 'all',
  priority: 'all',
  category: 'all',
  assignee: 'all',
  dateRange: 'all',
  search: ''
})

// Filter tasks based on filters
const filteredTasks = tasks.filter(task => {
  if (filters.status !== 'all') {
    if (filters.status === 'completed' && !task.is_completed) return false
    if (filters.status === 'active' && task.is_completed) return false
  }
  if (filters.priority !== 'all' && task.priority !== filters.priority) return false
  if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false
  // Add more filter logic...
  return true
})

// In UI:
<AdvancedFilter
  filters={filters}
  onFiltersChange={setFilters}
  categories={['Development', 'Design', 'Marketing']}
  assignees={teamMembers.map(m => ({ id: m.id, name: m.full_name }))}
/>
```

---

## 📦 Test Bulk Actions

**Integration example:**

```tsx
import BulkActions from '@/components/tasks/BulkActions'
import { bulkUpdateTasks, bulkDeleteTasks } from '@/lib/task-operations'

const [selectedTasks, setSelectedTasks] = useState<string[]>([])

// Add checkboxes to task list
{tasks.map(task => (
  <div key={task.id}>
    <input
      type="checkbox"
      checked={selectedTasks.includes(task.id)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedTasks([...selectedTasks, task.id])
        } else {
          setSelectedTasks(selectedTasks.filter(id => id !== task.id))
        }
      }}
    />
    {/* Task content */}
  </div>
))}

// Add bulk actions bar
<BulkActions
  selectedTasks={selectedTasks}
  onClearSelection={() => setSelectedTasks([])}
  onBulkComplete={async () => {
    await bulkUpdateTasks(selectedTasks, { is_completed: true })
    setSelectedTasks([])
    loadTasks()
  }}
  onBulkDelete={async () => {
    if (confirm(`Delete ${selectedTasks.length} tasks?`)) {
      await bulkDeleteTasks(selectedTasks)
      setSelectedTasks([])
      loadTasks()
    }
  }}
  onBulkChangePriority={async (priority) => {
    await bulkUpdateTasks(selectedTasks, { priority })
    setSelectedTasks([])
    loadTasks()
  }}
/>
```

---

## 🎨 Available API Endpoints

### Tasks API
- `GET /api/tasks?workspaceId={id}` - Get all tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks` - Update task
- `DELETE /api/tasks?id={id}` - Delete single task
- `DELETE /api/tasks?bulkIds={id1,id2,id3}` - Bulk delete

### Comments API
- `GET /api/comments?taskId={id}` - Get task comments
- `POST /api/comments` - Add comment
- `DELETE /api/comments?id={id}` - Delete comment

---

## 🔧 Utility Functions Available

### Date Parsing (`lib/date-parser.ts`)
```tsx
import { parseNaturalDate, extractDateFromText, formatRelativeDate } from '@/lib/date-parser'

const parsed = parseNaturalDate("tomorrow at 3pm")
// { date: Date, text: "tomorrow at 3pm", formatted: "Jan 06, 2026" }

const { title, date } = extractDateFromText("Review PR tomorrow")
// { title: "Review PR", date: Date, dateText: "tomorrow" }

const relative = formatRelativeDate(new Date())
// "Today"
```

### Data Export (`lib/export.ts`)
```tsx
import { exportTasks, exportTimeEntries, exportProjects, exportNotes } from '@/lib/export'

exportTasks(tasks, { format: 'csv', filename: 'my-tasks' })
// Downloads my-tasks.csv
```

### Task Operations (`lib/task-operations.ts`)
```tsx
import { createTask, updateTask, deleteTask, bulkUpdateTasks, bulkDeleteTasks } from '@/lib/task-operations'

await createTask(workspaceId, 'New task', {
  description: 'Task description',
  priority: 'high',
  dueDate: '2026-01-10',
  projectId: 'project-id',
  category: 'Development'
})

await bulkUpdateTasks(['id1', 'id2'], { priority: 'urgent' })
await bulkDeleteTasks(['id1', 'id2', 'id3'])
```

---

## 🎬 Next Steps

1. **Integrate view switcher** in tasks page
2. **Add export button** to toolbars
3. **Create task detail modal** with comments
4. **Add bulk select checkboxes** to task lists
5. **Test all features end-to-end**

---

## 🐛 Troubleshooting

### Keyboard shortcuts not working?
- Make sure you're not in an input field
- Check browser console for conflicts
- Some shortcuts only work on specific pages

### Natural language dates not parsing?
- Check the date format you're using
- chrono-node supports many formats, try variations
- See examples in the code

### Components not showing?
- Make sure you imported them correctly
- Check if you have the required props
- Look for console errors

### Build errors?
- Run `npm install` to ensure all packages are installed
- Check TypeScript errors with `npm run build`
- Review the files mentioned in error messages

---

**Happy Testing! 🚀**

Questions? Check [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for detailed feature documentation.
