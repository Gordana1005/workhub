ProductivityHub v2.0 - Complete Project Specification, Development Guide, and Full Implementation

Goal: Build a collaborative, all-in-one productivity platform with project management, task tracking, time logging, notes, and analytics — all wrapped in a beautiful Neumorphic design with full Dark Mode support.

🎯 Project Vision
A collaborative productivity platform that combines:

Project & task management (Kanban + List views)
Time tracking with active timer
Project-specific notes (Markdown/Rich text)
Team collaboration via Workspaces
PDF reports & analytics
Distinct Neumorphic UI with seamless Light/Dark mode

Teams can create multiple workspaces, invite members, manage projects, assign tasks, log time, and export reports — all in a soft, modern, tactile interface.

🎨 Design Philosophy
Visual Style: Neumorphism

Soft, extruded plastic look achieved with subtle shadows and highlights.
Elements appear slightly raised (outer shadow) or pressed in (inner shadow).

Light Mode

Background: #e0e5ec
Cards/Surfaces: #e0e5ec
Shadows: White highlight + soft gray shadow

Dark Mode

Background: #212529
Cards/Surfaces: #2b3035
Shadows: Darker inner/outer shadows for depth

Typography

Font: Inter (or fallback to SF Pro / system sans-serif)
Headings: Bold, large
Body: Regular, highly legible

Animations

Smooth page/layout transitions using Framer Motion

Color Palette (Themable)








































ElementLight ModeDark ModeBackground#e0e5ec#212529Surface / Cards#e0e5ec#2b3035Text Primary#4a5568#e2e8f0Text Secondary#a0aec0#a0aec0Shadow Light#ffffff (100%)#32383e (15%)Shadow Dark#a3b1c6 (40%)#16191b (80%)
Accent Gradients

Tasks (Blue): #667eea → #764ba2
Projects (Purple): #89f7fe → #66a6ff
Analytics (Pink): #fa709a → #fee140
Timer/Success (Green): #43e97b → #38f9d7


🏗️ Tech Stack

















































LayerTechnologyFrameworkNext.js 14+ (App Router)Database & AuthSupabase (PostgreSQL + Auth)StylingTailwind CSS + Custom Neumorphic classesState ManagementZustand + TanStack Query (React Query)ChartsRechartsPDF Exportjspdf + html2canvas (or @react-pdf/renderer)Iconslucide-reactFormsreact-hook-formAnimationsframer-motionUtilitiesclsx, tailwind-merge, date-fns

👥 User Roles & Permissions
1. Global User (Profile)

Stored in profiles table (extends Supabase Auth)
Attributes: full_name, avatar_url, job_title, department, email

2. Workspaces (Multi-tenancy)

Users can belong to multiple workspaces
Roles:
Admin: Full control (invite/remove, change roles, delete workspace, manage all projects)
Member: View/create tasks, log time, comment, complete assigned tasks


3. Projects

Belong to a Workspace
Only Workspace members can access
Only Creator or Workspace Admin can delete


📱 Core Features & Views
1. Authentication Flow

Login / Signup (Email + Password or Magic Link)
Neumorphic form inputs
Onboarding: Set name, job title, department
After login → Workspace selector or "Create First Workspace"

2. Dashboard (Home)

Welcome hero + Active Workspace switcher
My Tasks section (tasks assigned to user)
Active Timer (global sticky component)
Personal daily stats (tasks completed, hours logged)

3. Projects View

Grid of project cards (Neumorphic)
Card shows: Name, description snippet, category badge, color stripe, member avatars (3 + overflow count)
Project Detail Page:
Header with title, category, color, member list
"Add Member" dropdown (workspace members)
Tabs: Board, Timeline, Notes, Settings


4. Tasks

Board View (drag-and-drop columns: To Do / In Progress / Done)
List View (grouped by priority/status)
Task Modal (Create/Edit):
Title, Rich Description
Subtasks (checklist)
Assignee (dropdown)
Priority (Low/Med/High/Urgent)
Due Date (date picker)
Comments thread


5. Notes (Project-scoped)

Markdown or Rich Text editor
Searchable by title/content
Listed per project

6. Team & Workspace Settings (Admin only)

Member list with role toggle
Invite via:
Email → sends magic link
Generate shareable join link (with token)


7. Reports & Export

PDF Export tab
Filters: Date range, Project, User
Content: Summary stats, task list, time logs
"Generate PDF" button

🗄️ Complete Database Schema (Supabase / PostgreSQL)
SQL-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  job_title text,
  department text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. WORKSPACES
create table workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. WORKSPACE_MEMBERS
create type workspace_role as enum ('admin', 'member');

create table workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role workspace_role default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(workspace_id, user_id)
);

-- 4. INVITATIONS
create table invitations (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  email text not null,
  token text unique not null,
  role workspace_role default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone default (now() + interval '7 days')
);

-- 5. PROJECTS
create table projects (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  creator_id uuid references profiles(id),
  name text not null,
  description text,
  category text,
  color text default '#667eea',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. TASKS
create type priority_level as enum ('low', 'medium', 'high', 'urgent');

create table tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  creator_id uuid references profiles(id),
  assignee_id uuid references profiles(id),
  title text not null,
  description text,
  priority priority_level default 'medium',
  due_date timestamp with time zone,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. SUBTASKS
create table subtasks (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. TIME_ENTRIES
create table time_entries (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  user_id uuid references profiles(id) not null,
  duration int not null, -- in seconds
  description text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. NOTES
create table notes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  author_id uuid references profiles(id),
  title text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. Row Level Security (RLS) Policies (Essential for multi-tenancy)
-- Example: Users can only see data in workspaces they belong to
-- (You will enable RLS on all tables and add policies in Supabase dashboard or via SQL)

🚀 Project Setup & Boilerplate
1. Create the Next.js App
Bashnpx create-next-app@latest productivity-hub --typescript --tailwind --eslint --app --src-dir
cd productivity-hub
2. Install Dependencies
Bashnpm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  zustand \
  date-fns \
  lucide-react \
  recharts \
  clsx \
  tailwind-merge \
  react-hook-form \
  framer-motion \
  jspdf \
  html2canvas \
  @tiptap/react @tiptap/pm @tiptap/starter-kit
Optional: Add @react-pdf/renderer if you prefer server-side PDF generation.
3. Tailwind Configuration (tailwind.config.ts)
TypeScriptimport type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: "#e0e5ec",
          dark: "#212529",
        },
        surface: {
          light: "#e0e5ec",
          dark: "#2b3035",
        },
        text: {
          primary: { light: "#4a5568", dark: "#e2e8f0" },
          secondary: "#a0aec0",
        },
        accent: {
          blue: "#667eea",
          purple: "#764ba2",
          pink: "#fa709a",
          green: "#43e97b",
        },
      },
      boxShadow: {
        neumorphic: "9px 9px 16px rgba(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)",
        "neumorphic-inset": "inset 6px 6px 10px rgba(163,177,198,0.7), inset -6px -6px 10px rgba(255,255,255,0.8)",
        "neumorphic-dark": "5px 5px 10px #16191b, -5px -5px 10px #32383e",
        "neumorphic-dark-inset": "inset 5px 5px 10px #16191b, inset -5px -5px 10px #32383e",
      },
    },
  },
  plugins: [],
};

export default config;
4. Environment Variables (.env.local)
envNEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
5. Supabase Client (src/lib/supabase.ts)
TypeScriptimport { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

Full Implementation (Steps 1-10)
Note: This section includes all code from the implementation guide. Each step has its own nested Markdown structure for folder additions and code blocks. Code is in TypeScript with Next.js App Router. For brevity, some parts are summarized—expand in VS Code. Install missing deps as needed (e.g., react-beautiful-dnd, @tanstack/react-query).
Step 1: Authentication Pages (Login, Signup, Onboarding)
Folder Structure Additions

src/app/auth/(pages)/login/page.tsx
src/app/auth/(pages)/signup/page.tsx
src/app/auth/(pages)/onboarding/page.tsx
src/components/auth/LoginForm.tsx
src/components/auth/SignupForm.tsx
src/components/auth/OnboardingForm.tsx
src/middleware.ts (for auth protection)

Key Code
src/middleware.ts
TypeScriptimport { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}
src/app/auth/(pages)/login/page.tsx
TypeScriptimport LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm />
    </div>
  )
}
src/components/auth/LoginForm.tsx
TypeScriptimport { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button' // Assume a Neumorphic Button component

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) router.push('/dashboard')
  }

  return (
    <div className="p-8 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark bg-surface">
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 p-4 rounded-md shadow-neumorphic-inset" placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4 p-4 rounded-md shadow-neumorphic-inset" placeholder="Password" />
      <Button onClick={handleLogin}>Login</Button>
    </div>
  )
}
Similar for SignupForm.tsx (use supabase.auth.signUp)
TypeScript// ... similar to LoginForm, but signUp and redirect to onboarding
src/app/auth/(pages)/onboarding/page.tsx
TypeScriptimport OnboardingForm from '@/components/auth/OnboardingForm'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <OnboardingForm />
    </div>
  )
}
src/components/auth/OnboardingForm.tsx
TypeScriptimport { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingForm() {
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const router = useRouter()

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ full_name: fullName, job_title: jobTitle, department }).eq('id', user.id)
      router.push('/dashboard')
    }
  }

  return (
    <div className="p-8 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark bg-surface">
      {/* Inputs for name, job, dept with Neumorphic styling */}
      <Button onClick={handleSubmit}>Complete Profile</Button>
    </div>
  )
}
Next: Protect routes in layout.tsx with auth checks.
Step 2: Global Layout (Sidebar, Topbar, Dark Mode Toggle, Workspace Switcher)
Folder Structure Additions

src/app/layout.tsx (update)
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
src/components/layout/DarkModeToggle.tsx
src/stores/useThemeStore.ts (Zustand)
src/stores/useWorkspaceStore.ts (Zustand)

Key Code
src/stores/useThemeStore.ts
TypeScriptimport { create } from 'zustand'

export const useThemeStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}))
src/app/layout.tsx (Update)
TypeScriptimport { useEffect } from 'react'
import { useThemeStore } from '@/stores/useThemeStore'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default function RootLayout({ children }) {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <html lang="en">
      <body className={`${theme} bg-background`}>
        <div className="flex">
          <Sidebar />
          <div className="flex-1">
            <Topbar />
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
src/components/layout/Topbar.tsx
TypeScriptimport DarkModeToggle from './DarkModeToggle'
import WorkspaceSwitcher from './WorkspaceSwitcher' // Implement similarly

export default function Topbar() {
  return (
    <header className="p-4 shadow-neumorphic flex justify-between">
      <WorkspaceSwitcher />
      <DarkModeToggle />
    </header>
  )
}
src/components/layout/DarkModeToggle.tsx
TypeScriptimport { useThemeStore } from '@/stores/useThemeStore'
import { Moon, Sun } from 'lucide-react'

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  )
}
src/components/layout/Sidebar.tsx
TypeScript// Navigation links to Dashboard, Projects, Team, etc. with Neumorphic buttons
src/stores/useWorkspaceStore.ts
TypeScriptimport { create } from 'zustand'

export const useWorkspaceStore = create((set) => ({
  currentWorkspace: null,
  workspaces: [],
  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
  fetchWorkspaces: async (userId) => {
    const { data } = await supabase.from('workspace_members').select('*, workspace(*)').eq('user_id', userId)
    set({ workspaces: data.map(d => d.workspace) })
  },
}))
Next: Use in Topbar for dropdown switcher.
Step 3: Workspace Management (Create/Join Workspace, Invitations)
Folder Structure Additions

src/app/workspaces/page.tsx
src/components/workspaces/WorkspaceForm.tsx
src/components/workspaces/InviteForm.tsx
src/app/invite/[token]/page.tsx (for joining via link)

Key Code
src/app/workspaces/page.tsx
TypeScriptimport WorkspaceForm from '@/components/workspaces/WorkspaceForm'
import InviteForm from '@/components/workspaces/InviteForm'

export default function WorkspacesPage() {
  return (
    <div>
      <WorkspaceForm /> {/* Create new */}
      <InviteForm /> {/* Send invite */}
    </div>
  )
}
src/components/workspaces/WorkspaceForm.tsx
TypeScriptimport { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export default function WorkspaceForm() {
  const [name, setName] = useState('')
  const { fetchWorkspaces } = useWorkspaceStore()

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: workspace } = await supabase.from('workspaces').insert({ name, owner_id: user.id }).select().single()
    await supabase.from('workspace_members').insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' })
    fetchWorkspaces(user.id)
  }

  return (
    <div className="shadow-neumorphic">
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleCreate}>Create Workspace</button>
    </div>
  )
}
src/components/workspaces/InviteForm.tsx
TypeScript// Input email, generate token, insert into invitations table, send email via Supabase or external service
import { v4 as uuidv4 } from 'uuid'
// ... generate token = uuidv4(), insert to invitations
// Copy link: `${origin}/invite/${token}`
src/app/invite/[token]/page.tsx
TypeScriptimport { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InvitePage({ params: { token } }) {
  const router = useRouter()

  const handleJoin = async () => {
    const { data: invite } = await supabase.from('invitations').select().eq('token', token).single()
    if (invite) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('workspace_members').insert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role })
      router.push('/dashboard')
    }
  }

  return <button onClick={handleJoin}>Join Workspace</button>
}
Step 4: Dashboard (My Tasks, Active Timer, Stats)
Folder Structure Additions

src/app/dashboard/page.tsx
src/components/dashboard/MyTasks.tsx
src/components/dashboard/ActiveTimer.tsx
src/components/dashboard/Stats.tsx
src/stores/useTimerStore.ts

Key Code
src/app/dashboard/page.tsx
TypeScriptimport MyTasks from '@/components/dashboard/MyTasks'
import ActiveTimer from '@/components/dashboard/ActiveTimer'
import Stats from '@/components/dashboard/Stats'

export default function Dashboard() {
  return (
    <div>
      <h1>Welcome</h1>
      <MyTasks />
      <ActiveTimer />
      <Stats />
    </div>
  )
}
src/components/dashboard/MyTasks.tsx
TypeScriptimport { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function MyTasks() {
  const { data: user } = supabase.auth.getUser() // Simplified
  const { data: tasks } = useQuery(['myTasks'], async () => {
    return supabase.from('tasks').select().eq('assignee_id', user.id).eq('is_completed', false)
  })

  return (
    <div>
      {tasks?.map(task => <div key={task.id} className="shadow-neumorphic">{task.title}</div>)}
    </div>
  )
}
src/stores/useTimerStore.ts
TypeScriptimport { create } from 'zustand'

export const useTimerStore = create((set) => ({
  time: 0,
  isRunning: false,
  start: () => set({ isRunning: true }),
  stop: async () => {
    set({ isRunning: false })
    // Insert to time_entries
  },
  tick: () => set((state) => ({ time: state.time + 1 })),
}))
src/components/dashboard/ActiveTimer.tsx
TypeScriptimport { useEffect } from 'react'
import { useTimerStore } from '@/stores/useTimerStore'

export default function ActiveTimer() {
  const { time, isRunning, start, stop, tick } = useTimerStore()

  useEffect(() => {
    let interval
    if (isRunning) interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  return (
    <div className="sticky bottom-0 p-4 shadow-neumorphic">
      <span>{time} seconds</span>
      <button onClick={isRunning ? stop : start}>{isRunning ? 'Stop' : 'Start'}</button>
    </div>
  )
}
src/components/dashboard/Stats.tsx
TypeScript// Use React Query to fetch daily completed tasks, total time from time_entries
Step 5: Projects CRUD (List, Create, Detail View with Tabs)
Folder Structure Additions

src/app/projects/page.tsx
src/app/projects/[id]/page.tsx
src/components/projects/ProjectList.tsx
src/components/projects/ProjectForm.tsx
src/components/projects/ProjectTabs.tsx

Key Code
src/app/projects/page.tsx
TypeScriptimport ProjectList from '@/components/projects/ProjectList'
import ProjectForm from '@/components/projects/ProjectForm'

export default function ProjectsPage() {
  return (
    <div>
      <ProjectForm />
      <ProjectList />
    </div>
  )
}
src/components/projects/ProjectList.tsx
TypeScriptimport { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import Link from 'next/link'

export default function ProjectList() {
  const { currentWorkspace } = useWorkspaceStore()
  const { data: projects } = useQuery(['projects'], async () => {
    return supabase.from('projects').select().eq('workspace_id', currentWorkspace.id)
  })

  return (
    <div className="grid grid-cols-3 gap-4">
      {projects?.map(project => (
        <Link key={project.id} href={`/projects/${project.id}`} className="shadow-neumorphic p-4">
          <h2>{project.name}</h2>
          <p>{project.description}</p>
          {/* Avatars, category badge */}
        </Link>
      ))}
    </div>
  )
}
src/app/projects/[id]/page.tsx
TypeScriptimport ProjectTabs from '@/components/projects/ProjectTabs'

export default function ProjectDetail({ params: { id } }) {
  return <ProjectTabs projectId={id} />
}
src/components/projects/ProjectTabs.tsx
TypeScriptimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs' // Assume shadcn/ui or similar

export default function ProjectTabs({ projectId }) {
  return (
    <Tabs defaultValue="board">
      <TabsList>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="board">{/* Tasks board */}</TabsContent>
      {/* Others */}
    </Tabs>
  )
}
src/components/projects/ProjectForm.tsx
TypeScript// Form to insert new project into DB, with name, desc, category, color
Step 6: Tasks System (Board View, Task Modal, Subtasks, Comments)
Folder Structure Additions

src/components/tasks/TaskBoard.tsx
src/components/tasks/TaskModal.tsx
src/components/tasks/SubtaskList.tsx
src/components/tasks/CommentsThread.tsx

Key Code
src/components/tasks/TaskBoard.tsx (Integrate into ProjectTabs "board")
TypeScriptimport { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd' // Install react-beautiful-dnd

export default function TaskBoard({ projectId }) {
  const { data: tasks } = useQuery(['tasks', projectId], () => supabase.from('tasks').select().eq('project_id', projectId))

  const updateTask = useMutation(async ({ id, updates }) => supabase.from('tasks').update(updates).eq('id', id))

  const onDragEnd = (result) => {
    // Update status based on drop column (e.g., 'todo' to 'inprogress')
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Columns: To Do, In Progress, Done */}
      <Droppable droppableId="todo">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {tasks?.filter(t => !t.is_completed).map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="shadow-neumorphic">
                    {task.title}
                  </div>
                )}
              </Draggable>
            ))}
          </div>
        )}
      </Droppable>
      {/* Other columns */}
    </DragDropContext>
  )
}
src/components/tasks/TaskModal.tsx
TypeScriptimport { Dialog } from '@/components/ui/Dialog'
import { useForm } from 'react-hook-form'
// Fields: title, desc (rich text with @tiptap/react), assignee dropdown, priority, due date
// Subtasks component, Comments component
src/components/tasks/SubtaskList.tsx
TypeScript// Checklist of subtasks, insert/update in subtasks table
src/components/tasks/CommentsThread.tsx
TypeScript// Simple list, but comments not in schema—add comments table if needed: create table comments (id, task_id, author_id, content, created_at)
Note: Add comments table to schema if not present.
Step 7: Time Tracking (Timer Component, Time Entries)
Already partially in Step 4 (ActiveTimer)

Expand to link timer to task/project
On stop, insert to time_entries with duration, task_id, etc.

Update src/stores/useTimerStore.ts
TypeScript// Add currentTaskId, setCurrentTask
// On stop: supabase.from('time_entries').insert({ duration: time, task_id: currentTaskId, ... })
Step 8: Notes (Rich Text Editor per Project)
Folder Structure Additions

src/components/notes/NotesList.tsx
src/components/notes/NoteEditor.tsx

Key Code (Integrate into ProjectTabs "notes")
src/components/notes/NotesList.tsx
TypeScriptimport { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function NotesList({ projectId }) {
  const { data: notes } = useQuery(['notes', projectId], () => supabase.from('notes').select().eq('project_id', projectId))

  return (
    <div>
      {notes?.map(note => <div key={note.id}>{note.title}</div>)}
      <NoteEditor projectId={projectId} />
    </div>
  )
}
src/components/notes/NoteEditor.tsx
TypeScriptimport { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// Setup Tiptap editor, on save: insert to notes table with content as JSON or Markdown
Step 9: Reports & PDF Export
Folder Structure Additions

src/components/reports/ReportForm.tsx
src/lib/generatePDF.ts

Key Code (Add to ProjectTabs or separate page)
src/components/reports/ReportForm.tsx
TypeScript// Filters: date range, project, user
// Button to call generatePDF
src/lib/generatePDF.ts
TypeScriptimport jsPDF from 'jspdf'

export async function generatePDF(filters) {
  // Fetch data from tasks, time_entries via Supabase
  const doc = new jsPDF()
  doc.text('Report Summary', 10, 10)
  // Add stats, lists
  doc.save('report.pdf')
}
Note: For complex layouts, use html2canvas to convert HTML to PDF.
Step 10: Polish (Animations, Mobile Responsiveness, Accessibility)
Global Updates

Add Framer Motion to components: e.g., <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
Tailwind: Use responsive classes (sm:, md:, lg:)
Accessibility: Add aria-labels, keyboard nav, alt texts
Dark Mode: Ensure all components use theme-aware classes
Mobile: Use flex/grid for responsive layouts, hamburger menu for sidebar

Testing: Run npm run dev, test auth flow, create workspace, etc.