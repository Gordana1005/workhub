# ProductivityHub - Project Instructions

## Overview
This is a collaborative productivity platform built with Next.js 14, TypeScript, Supabase, and Tailwind CSS. The app provides project management, task tracking, time logging, team collaboration, and analytics in a dark slate theme.

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS (dark slate theme)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Rich Text**: Tiptap
- **PDF Generation**: jsPDF, html2canvas
- **Animations**: Framer Motion

## Project Structure
```
workhub/
├── app/                          # Next.js app directory
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── api/              # API routes
│   │   │   │   ├── check-db/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── setup-schema/
│   │   │   │   ├── verify-schema/
│   │   │   │   └── workspaces/
│   │   │   ├── auth/             # Auth pages (login, signup, onboarding)
│   │   │   ├── dashboard/        # Dashboard pages
│   │   │   │   ├── projects/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   ├── tasks/
│   │   │   │   ├── team/
│   │   │   │   ├── time-tracker/
│   │   │   │   └── workspace/
│   │   │   ├── globals.css       # Global styles (forced dark mode)
│   │   │   ├── layout.tsx        # Root layout with providers
│   │   │   └── page.tsx          # Home page (redirects based on auth)
│   │   ├── components/           # Reusable components
│   │   │   ├── auth/             # Auth forms
│   │   │   ├── dashboard/        # Dashboard components
│   │   │   ├── layout/           # Layout components (sidebar, topbar)
│   │   │   ├── ui/               # UI components (Button)
│   │   │   └── workspace/        # Workspace components
│   │   ├── lib/                  # Utilities
│   │   │   ├── supabase.ts       # Supabase client
│   │   │   ├── project-operations.ts
│   │   │   ├── task-operations.ts
│   │   │   └── workspace-operations.ts
│   │   └── stores/               # Zustand stores
│   │       ├── useThemeStore.ts
│   │       ├── useTimerStore.ts
│   │       └── useWorkspaceStore.ts
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── supabase/                     # Supabase configuration
│   └── config.toml
├── database-schema.sql           # Database schema
├── remote-schema.sql
├── safe-schema-update.sql
└── scripts/
    └── create-test-data.sql      # Test data script
```

## Database Schema
The app uses the following main tables:
- `profiles` - User profiles (extends auth.users)
- `workspaces` - Team workspaces
- `workspace_members` - Workspace membership with roles
- `invitations` - Workspace invitations
- `projects` - Projects within workspaces
- `tasks` - Tasks within projects
- `subtasks` - Subtasks within tasks
- `time_entries` - Time tracking entries
- `notes` - Project notes

## Authentication Flow
1. User visits `/` → redirects to `/auth/login` if not authenticated
2. After login, redirects to `/auth/onboarding` if profile incomplete
3. After onboarding, redirects to `/dashboard`
4. Dashboard shows workspace selection if user has workspaces but none selected
5. Otherwise shows main dashboard with stats

## Current Status
### ✅ Working Features
- **Authentication**: Login, signup, onboarding
- **Workspaces**: Create, select, manage workspaces
- **Projects**: Full CRUD operations (create, read, update, delete)
- **Dashboard**: Stats display (tasks completed, time logged, etc.)
- **Navigation**: Sidebar with all main sections
- **Design**: Clean dark slate theme throughout
- **API Routes**: Dashboard stats, workspace management

### ⚠️ Partially Working
- **Tasks Page**: UI is complete but not connected to database
- **Dashboard Stats**: Shows 0 values (needs real data or test data)

### ❌ Not Implemented
- **Task CRUD**: Create, edit, delete tasks
- **Time Tracking**: Active timer functionality
- **Reports**: Analytics and PDF generation
- **Team Management**: Invite members, manage roles
- **Notes**: Rich text notes for projects
- **Settings**: User and workspace settings

## Key Components
- **Layout Components**: Sidebar, Topbar, WorkspaceSwitcher
- **Auth Components**: LoginForm, SignupForm, OnboardingForm
- **Dashboard Components**: Stats, MyTasks, ActiveTimer
- **UI Components**: Button (custom styled)
- **Providers**: ThemeProvider, QueryProvider

## API Routes
- `/api/check-db` - Database connection check
- `/api/dashboard` - Dashboard statistics
- `/api/setup-schema` - Database schema setup
- `/api/verify-schema` - Schema verification
- `/api/workspaces` - Workspace CRUD operations
- `/api/workspaces/[id]` - Individual workspace operations

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key (for schema setup)

## Development Setup
1. Install dependencies: `npm install`
2. Set up Supabase project and configure environment variables
3. Run database schema: Execute `database-schema.sql` in Supabase SQL Editor
4. (Optional) Run test data: Execute `scripts/create-test-data.sql`
5. Start dev server: `npm run dev`
6. Visit `http://localhost:3000`

## Build & Deployment
- Build: `npm run build`
- Start production: `npm start`
- Deploy to Vercel: Automatic on git push

## Design System
- **Background**: `bg-slate-900`
- **Cards/Surfaces**: `bg-slate-800` with `border-slate-700`
- **Text**: White (headings), `text-gray-400` (secondary)
- **Buttons**: Solid colors (`bg-blue-600`, `bg-green-600`, etc.)
- **Hover Effects**: Border color changes instead of shadows
- **No gradients or heavy shadows** (clean, professional look)

## Next Steps for Development
1. Connect Tasks page to database (similar to Projects page)
2. Implement task CRUD operations
3. Add time tracking functionality
4. Create reports and analytics
5. Implement team management features
6. Add notes functionality
7. Build settings pages
8. Add real-time updates
9. Implement notifications
10. Add file attachments

## Known Issues
- Tasks page UI exists but no database integration
- Dashboard stats may show 0 if no test data is loaded
- Some pages are placeholder (Reports, Settings, etc.)
- No error handling for API failures in some components
- Workspace switching may need URL parameter handling

## Scripts Available
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

This document provides a comprehensive overview of the current state of ProductivityHub. The foundation is solid with working authentication, workspace management, and project CRUD operations. The main areas needing development are task management, time tracking, and additional features like reports and team management.