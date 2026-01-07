# WorkHub Expansion & Hardening Plan
**Version:** 2.0  
**Created:** January 6, 2026  
**Status:** In Progress - Phase 10 Complete  
**Estimated Total Time:** 275-325 hours (11-13 weeks)

---

## 🚀 IMPLEMENTATION PROGRESS

### Phase 10: Finance Tracker - ✅ COMPLETE
**Status:** Production Ready | Database Applied | All Features Working

#### 10.1 Personal Finance Core - ✅ COMPLETE
- ✅ Database migration (011_finance.sql)
  - finance_accounts table (5 types: bank/cash/credit_card/investment/crypto)
  - finance_categories table (15 system categories + custom support)
  - finance_transactions table (with auto-balance trigger)
  - finance_budgets table (category-based budgeting)
  - finance_goals table (savings goals with targets)
  - RLS policies for workspace/user access control

- ✅ Finance Dashboard (/dashboard/finance)
  - 4 stat cards (Total Balance, Monthly Income, Expenses, Net Income)
  - Pie chart for spending by category (Recharts)
  - Recent transactions list with type indicators
  - Accounts grid with balances by type
  - Tab navigation (Overview | Goals)

- ✅ Account Management (AccountManager.tsx)
  - Create/edit financial accounts modal
  - Support for 5 account types
  - 6 currencies (USD, EUR, GBP, JPY, CAD, AUD)
  - Initial balance and active/inactive status

- ✅ Natural Language Transaction Entry (finance-parser.ts)
  - Parse plain English: "Spent $50 on groceries yesterday"
  - Extract amount, type, category, date, description
  - 50+ category keywords for auto-categorization
  - Date parsing with chrono-node

- ✅ QuickAddTransaction Component
  - Real-time natural language parsing with preview
  - Account selector dropdown
  - Instant transaction creation

- ✅ CSV Import (ImportTransactions.tsx)
  - Upload bank export CSV files
  - Auto-detect columns (date, description, amount, category)
  - Manual column mapping override
  - Batch insert with papaparse

#### 10.2 Project Budget Tracking - ✅ COMPLETE
- ✅ Database migration (012_project_budgets.sql)
  - Added budget, budget_currency, hourly_rate to projects table
  - Created project_financials view (aggregates expenses, income, billable hours, profit)

- ✅ ProjectBudgetCard Component
  - Integrated into project detail page
  - Budget setup form (amount + hourly rate)
  - Budget progress bar with color coding (green/amber/red)
  - 4 financial stat cards: Remaining, Income, Billable Hours, Profit/Loss
  - Over-budget warnings
  - Quick actions: Add Expense, Add Income

#### 10.3 Financial Goals & Forecasting - ✅ COMPLETE
- ✅ Database migration (013_finance_goals_forecasting.sql)
  - Enhanced finance_goals table (status, notes, milestones)
  - Created finance_recurring_templates table (for future recurring transactions)
  - Created finance_scenarios table (for what-if modeling)

- ✅ GoalBuilder Component
  - Two calculation modes:
    - Forward: Target amount + date → daily/weekly/monthly savings needed
    - Backward: Daily savings rate → estimated completion date
  - Forecast results with per day/week/month breakdown
  - Form validation and goal saving

- ✅ GoalsDashboard Component
  - Goals tab on Finance page
  - Goal cards with circular progress indicators
  - Status badges (Complete, On Track, At Risk, Overdue)
  - Stats: Remaining amount, Days left
  - Quick-add progress functionality
  - Edit/Delete actions per goal
  - Empty state with create goal CTA

**Files Created:** 13
- `database/migrations/011_finance.sql`
- `database/migrations/012_project_budgets.sql`
- `database/migrations/013_finance_goals_forecasting.sql`
- `supabase/migrations/20260107000003_finance.sql`
- `supabase/migrations/20260107000004_project_budgets.sql`
- `supabase/migrations/20260107000005_finance_goals_forecasting.sql`
- `src/lib/finance-parser.ts`
- `src/components/finance/QuickAddTransaction.tsx`
- `src/components/finance/ImportTransactions.tsx`
- `src/components/finance/AccountManager.tsx`
- `src/components/finance/ProjectBudgetCard.tsx`
- `src/components/finance/GoalBuilder.tsx`
- `src/components/finance/GoalsDashboard.tsx`

**Files Modified:** 3
- `src/components/layout/Sidebar.tsx` (added Finance navigation link)
- `src/app/dashboard/projects/[id]/page.tsx` (added ProjectBudgetCard)
- `src/app/dashboard/finance/page.tsx` (enhanced with Goals tab)

**Database Tables Created:** 8
- finance_accounts, finance_categories, finance_transactions
- finance_budgets, finance_goals
- finance_recurring_templates, finance_scenarios
- project_financials (view)

**Build Status:** ✅ Passing
- Finance page: 12 kB (263 kB with shared JS)
- Project detail page: 9.64 kB (151 kB with shared JS)
- TypeScript Errors: 0
- ESLint Warnings: 22 (non-critical exhaustive-deps)

**Key Features:**
- Complete personal finance tracking (accounts, transactions, categories)
- Natural language transaction entry with AI parsing
- CSV bank statement import
- Project budget management with billable hours
- Financial goal setting with dual calculation modes
- Progress tracking and forecasting

---

### Phase 9: Plans Feature - ✅ COMPLETE
**Status:** Production Ready | Database Applied | All Features Working

#### 9.1 Plans Database & UI - ✅ COMPLETE
- ✅ Database migration (010_plans.sql)
  - plans table (strategic roadmaps, OKRs, quarterly goals)
  - plan_milestones table (with auto-completion from tasks)
  - milestone_tasks junction table (link tasks to milestones)
  - Automatic milestone completion trigger
  - RLS policies for workspace access control
  - Performance indexes (workspace, status, dates, order)

- ✅ Plans List Page (/dashboard/plans)
  - Plans grid with color-coded cards
  - 4 stat cards (Active Plans, Completed, Total Milestones, Avg Progress)
  - Status badges (draft, active, completed, cancelled)
  - Progress bars with overall completion percentage
  - Days remaining calculation
  - Timeline display (start → end dates)
  - Create plan modal with form validation
  - Empty state with call-to-action

- ✅ Plan Detail Page (/dashboard/plans/[id])
  - Plan header with color indicator and status
  - Strategic goal display
  - 4 detailed stats (Timeline, Days Remaining, Milestones, Progress)
  - Back navigation to plans list

#### 9.2 Gantt Timeline & Milestones - ✅ COMPLETE
- ✅ Gantt Timeline Component
  - Week/Month view toggle
  - Interactive timeline with colored milestone markers
  - Progress bars for each milestone
  - "Today" marker line
  - Hover tooltips with milestone details
  - Overdue indicator (red for missed deadlines)
  - Completed indicator (green for done)
  - Horizontal scroll for long timelines
  - Legend for status colors

- ✅ Milestone Editor
  - Create/Edit milestone modal
  - Name, description, target date fields
  - Task linking system (link existing tasks)
  - Task search and selection
  - Visual task list with completion status
  - Unlink tasks functionality
  - Automatic progress calculation from linked tasks
  - Progress bar preview
  - Form validation

- ✅ Milestone Management
  - Milestone list with completion checkboxes
  - Progress bars per milestone
  - Task count display
  - Edit/Delete actions on hover
  - Drag-friendly layout (prepared for reordering)
  - Empty state with create prompt

**Files Created:** 5
- `database/migrations/010_plans.sql`
- `src/app/dashboard/plans/page.tsx`
- `src/app/dashboard/plans/[id]/page.tsx`
- `src/components/plans/GanttTimeline.tsx`
- `src/components/plans/MilestoneEditor.tsx`

**Files Modified:** 1
- `src/components/layout/Sidebar.tsx` (added Plans navigation link)

**Database Tables Created:** 3
- plans (workspace-level strategic plans)
- plan_milestones (milestones with auto-completion)
- milestone_tasks (many-to-many with tasks)

**Build Status:** ✅ Passing
- Plans list page: 153 kB (4.39 kB + 148.6 kB shared)
- Plan detail page: 155 kB (5.63 kB + 149.4 kB shared)
- TypeScript Errors: 0
- ESLint Warnings: 18 (non-critical exhaustive-deps)

**Key Features:**
- Strategic planning layer above tasks
- Visual Gantt timeline with milestones
- Automatic progress tracking from linked tasks
- Color-coded plans for easy distinction
- OKR-style goal setting
- Quarterly/roadmap planning support

---

### Phase 8: Notes System Overhaul - ✅ COMPLETE
**Status:** 8.1 Complete | 8.2 Complete | Production Ready

#### 8.1 Rich Text Editor Upgrade - ✅ COMPLETE
- ✅ Installed Tiptap (@tiptap/react, starter-kit, all extensions)
- ✅ Created RichTextEditor component with full toolbar
  - Bold, Italic, Code, Strikethrough
  - Headings (H1, H2, H3)
  - Lists (Bullet, Numbered, Task/Checkbox)
  - Blockquotes and Code Blocks
  - Links and Images
  - Undo/Redo
- ✅ Integrated with NoteEditor modal
- ✅ Added Tiptap prose styles to globals.css
- ✅ Syntax highlighting with lowlight (code blocks)
- ✅ Task lists with checkbox support
- ✅ Placeholder support
- ⏭️ Slash commands - Skipped (requires tippy.js, can add later)

**Editor Features Working:**
- Full formatting toolbar
- Markdown shortcuts (e.g., **bold**, # heading)
- Rich HTML content storage
- Read-only and edit modes
- Image embedding via URL
- Link management
- Code block syntax highlighting

**Files Created:** 1
- `src/components/notes/RichTextEditor.tsx`

**Files Modified:** 3
- `src/components/notes/NoteEditor.tsx` (integrated RichTextEditor)
- `src/components/notes/NoteCard.tsx` (HTML stripping for preview)
- `src/app/globals.css` (added Tiptap prose styles)

**Dependencies Added:** 10 packages
- @tiptap/react, @tiptap/starter-kit
- @tiptap/extension-placeholder, link, image
- @tiptap/extension-code-block-lowlight
- @tiptap/extension-task-list, task-item
- lowlight

**Build Status:** ✅ Passing
- Notes page: 315 kB (174 kB + 141 kB shared)
- TypeScript Errors: 0
- ESLint Warnings: 11 (unchanged, non-critical)

#### 8.2 Advanced Note Features - ✅ COMPLETE
- ✅ Database migration (009_notes_advanced.sql)
  - parent_id column for nested notes (hierarchy support)
  - note_links table (wiki-style linking)
  - tags table (workspace-level tags with colors)
  - note_tags junction table
  - note_templates table (reusable templates)
  - note_versions table (version history)
  - Automatic version saving trigger
  - RLS policies for all new tables
  - Default templates (Meeting Notes, Project Documentation)

- ✅ Tags System
  - TagSelector component with search and color picker
  - 8 preset colors for tags
  - Auto-complete tag search
  - Create new tags inline
  - Tag display with colored badges
  - Remove tags functionality

- ✅ Template System
  - TemplateSelector modal with grid layout
  - Category filtering (Meeting, Project, Documentation, Brainstorm, General)
  - Template preview with usage count
  - Apply template to new note
  - Default templates pre-seeded

- ✅ Version History
  - VersionHistory component with side-by-side comparison
  - Automatic version saving on content/title change
  - Restore previous versions
  - Timeline view with relative timestamps
  - Preview any version before restoring

**Files Created:** 4
- `src/components/notes/TagSelector.tsx`
- `src/components/notes/TemplateSelector.tsx`
- `src/components/notes/VersionHistory.tsx`
- `database/migrations/009_notes_advanced.sql`

**Files Modified:** 3
- `src/components/notes/NoteEditor.tsx` (added tags, version history, template support)
- `src/components/notes/NotesList.tsx` (added template selector, "From Template" button)
- `src/app/dashboard/notes/page.tsx` (passed workspaceId)

**Database Tables Created:** 5
- note_links (wiki-style links)
- tags (workspace tags)
- note_tags (many-to-many)
- note_templates (reusable templates)
- note_versions (automatic history)

**Build Status:** ✅ Passing
- Notes page: 318 kB (177 kB + 141 kB shared)
- TypeScript Errors: 0
- ESLint Warnings: 14 (3 new from components, non-critical)

#### 8.3 Collaboration & Sharing - ⏸️ SKIPPED
- Real-time collaborative editing (requires complex WebSocket setup)
- Share notes publicly/privately
- Comments on notes
**Reason:** Core functionality complete, collaboration can be added in future phases

---

### Phase 7: Launch Hardening Sprint - ✅ COMPLETE
**Status:** All subsections complete | Build Passing ✅ | Migrations Applied ✅ | Production Ready

#### 7.1 Code Quality & Reliability - ✅ COMPLETE
- ✅ Created ErrorBoundary component with production-ready error handling
- ✅ Created Logger utility with structured logging and correlation IDs
- ✅ Created useDebounce hook for search optimization
- ✅ Created LoadingSkeleton component (5 variants)
- ✅ Integrated ErrorBoundary into dashboard layout
- ✅ Created auth-guard.ts for API authentication & authorization
- ✅ Fixed exhaustive-deps warnings: **Reduced from 17 to 11** (35% reduction)
  - ✅ tasks/page.tsx
  - ✅ projects/page.tsx  
  - ✅ team/page.tsx
  - ✅ TaskDetailModal.tsx
  - ✅ focus/page.tsx
  - ⚠️ 11 remaining (non-critical, don't affect functionality)

**Optional (requires external accounts):**
- ⏭️ Sentry Integration - Skipped (requires Sentry account)
- ⏭️ Upstash Rate Limiting - Skipped (requires Upstash account)

#### 7.2 Mobile & Auth Fixes - ✅ COMPLETE
- ✅ Mobile-optimized CSS (touch targets 44x44px minimum)
- ✅ iOS Safari fixes (font-size 16px to prevent zoom)
- ✅ Safe area insets for notched devices
- ✅ Enhanced LoginForm with real-time validation
- ✅ Password visibility toggle with Eye/EyeOff icons
- ✅ OAuth support (Google & GitHub) with proper redirects
- ✅ OAuth callback handler (/auth/callback)
- ✅ Improved error handling with field-specific messages
- ✅ WCAG 2.5.5 AA compliant (accessibility)
- ✅ Reduced motion support for accessibility

#### 7.3 Performance & Scale - ✅ COMPLETE
- ✅ Dynamic imports for KanbanBoard & CalendarView
- ✅ Code splitting with next/dynamic
- ✅ Lazy loading with custom loading states
- ✅ Debounced search (300ms delay)
- ✅ Database performance indexes (007_performance_indexes.sql)
  - 40+ indexes created
  - Workspace, project, user indexes
  - Composite indexes for common queries
  - Full-text search (GIN indexes)
  - Date range optimization
- ✅ **Result: Tasks page 284 kB → 213 kB (25% reduction!)**

#### 7.4 Security Hardening - ✅ COMPLETE
- ✅ Database constraints (008_security_constraints.sql)
  - Valid priority values enforcement
  - Valid user roles enforcement
  - Task status consistency checks
  - Positive time entry durations
  - Unique email per workspace
  - Prevent self-referencing dependencies
  - Email format validation
  - Project status validation
- ✅ Created migration README with instructions
- ✅ All constraints use IF NOT EXISTS (safe to rerun)
- ✅ **Migrations applied successfully to production database**
- ✅ Fixed schema compatibility issues (notes.workspace_id, tasks.assignee_id)
- ✅ Added conditional checks for optional tables (webhooks, notifications, etc.)

**Optional (requires external services):**
- ⏭️ Upstash Rate Limiting - Skipped (requires paid/free tier account)
- ⏭️ Comprehensive API audit - Partial (auth-guard created)

**Files Created:** 9
**Files Modified:** 7
**Database Migrations:** 2 (Applied via Supabase CLI)

**Build Status:** ✅ Passing
- Routes: 33 (1 new: /auth/callback)
- TypeScript Errors: 0
- ESLint Warnings: 11 (non-critical)
- Bundle Size: 87.9 kB (First Load JS)
- Tasks Page: 213 kB (down from 284 kB)

---

## Table of Contents
- [Phase 7: Launch Hardening Sprint](#phase-7-launch-hardening-sprint)
- [Phase 8: Notes System Overhaul](#phase-8-notes-system-overhaul)
- [Phase 9: Plans Feature](#phase-9-plans-feature)
- [Phase 10: Finance Tracker](#phase-10-finance-tracker)
- [Phase 11: File Attachments & Storage](#phase-11-file-attachments--storage)
- [Phase 12: Notion-Inspired Features](#phase-12-notion-inspired-features)
- [Phase 13: Linear/ClickUp Features](#phase-13-linearclickup-features)
- [Phase 14: UX Polish & Retention](#phase-14-ux-polish--retention)
- [Phase 15: Testing & Documentation](#phase-15-testing--documentation)
- [Phase 16: Deepnote-Inspired Features](#phase-16-deepnote-inspired-features)

---

## PHASE 7: Launch Hardening Sprint
**Priority:** CRITICAL  
**Timeline:** Week 1 (40-50 hours)  
**Goal:** Fix breaking issues before real users arrive

### 7.1 Code Quality & Reliability (12 hours)

#### What You're Getting:
- Stable production build with zero warnings
- Automatic error tracking and alerting
- Traceable API requests for debugging
- Protected environment variables

#### Implementation Details:

**7.1.1 Fix ESLint Warnings (3 hours)**
```typescript
// Current Issue: 17 exhaustive-deps warnings in useEffect hooks
// Location: Multiple components - TaskDetailModal, KanbanBoard, etc.

// BEFORE (problematic):
useEffect(() => {
  loadTasks();
}, []); // Missing loadTasks dependency

// AFTER (fixed):
const loadTasks = useCallback(async () => {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId);
  setTasks(data || []);
}, [workspaceId]); // Proper dependencies

useEffect(() => {
  loadTasks();
}, [loadTasks]); // Now includes dependency
```

**Files to Update:**

- `app/src/app/dashboard/tasks/page.tsx`
- `app/src/components/tasks/TaskDetailModal.tsx`
- `app/src/components/tasks/KanbanBoard.tsx`
- `app/src/components/tasks/CalendarView.tsx`
- `app/src/app/dashboard/projects/page.tsx`
- `app/src/app/dashboard/team/page.tsx`

**7.1.2 Error Boundaries (4 hours)**

```typescript
// New File: app/src/components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            ```
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            ```
            <p className="text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Integration in Layouts:**

```typescript
// Update: app/src/app/dashboard/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950">
        {/* existing layout */}
        {children}
      </div>
    </ErrorBoundary>
  );
}
```

**7.1.3 Sentry Integration (3 hours)**

```bash
npm install @sentry/nextjs --save
npx @sentry/wizard@latest -i nextjs
```

```typescript
// New File: sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') return null;
    return event;
  },
});
```

**Environment Variables:**

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

**7.1.4 Structured Logging (2 hours)**

```typescript
// New File: app/src/lib/logger.ts
import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
  [key: string]: any;
}

class Logger {
  private correlationId: string;

  constructor() {
    this.correlationId = uuidv4();
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: context?.correlationId || this.correlationId,
      ...context,
    };

    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., Axiom, Logtail - free tiers available)
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(console.error);
    } else {
      console[level === 'error' ? 'error' : 'log'](logEntry);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, { ...context, error: error?.stack });
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();
```

**Usage in API Routes:**

```typescript
// app/src/app/api/tasks/route.ts
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const correlationId = request.headers.get('x-correlation-id') || uuidv4();
  
  try {
    logger.info('Creating task', { correlationId, endpoint: '/api/tasks' });
    // ... task creation logic
    logger.info('Task created successfully', { correlationId, taskId: newTask.id });
    return NextResponse.json(newTask);
  } catch (error) {
    logger.error('Failed to create task', error as Error, { correlationId });
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
```


---

### 7.2 Mobile \& Auth Fixes (8 hours)

#### What You're Getting:

- Perfect mobile experience on Android/iOS
- Smooth authentication flow with social login
- Accessible, touch-friendly forms


#### Implementation Details:

**7.2.1 Fix Android Viewport (2 hours)**

```typescript
// Update: app/src/app/layout.tsx
export const metadata: Metadata = {
  title: 'WorkHub',
  description: 'All-in-one productivity platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Prevents zoom on input focus (iOS)
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};
```

```css
/* Update: app/src/app/globals.css */
/* Android-specific fixes */
@supports (-webkit-touch-callout: none) {
  /* iOS Safari */
  input,
  textarea,
  select {
    font-size: 16px !important; /* Prevents auto-zoom */
  }
}

/* Touch target sizes (WCAG 2.5.5) */
button,
a,
input[type='checkbox'],
input[type='radio'] {
  min-width: 44px;
  min-height: 44px;
}

/* Prevent text inflation on mobile */
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

**7.2.2 Improve Auth Forms (3 hours)**

```typescript
// Update: app/src/app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Eye, EyeOff, Github, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setErrors({ password: error.message });
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          ```
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          ```
          ```
          <p className="text-slate-400 mb-8">Sign in to your WorkHub account</p>
          ```

          {/* Social Login */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              Continue with Google
            </button>
            <button
              onClick={() => handleSocialLogin('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              ```
              <div className="w-full border-t border-slate-800"></div>
              ```
            </div>
            <div className="relative flex justify-center text-sm">
              ```
              <span className="px-4 bg-slate-900 text-slate-500">Or continue with email</span>
              ```
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border ${
                  errors.email ? 'border-red-500' : 'border-slate-700'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="you@example.com"
              />
              {errors.email && (
                ```
                <p className="mt-2 text-sm text-red-500">{errors.email}</p>
                ```
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 bg-slate-800 border ${
                    errors.password ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="- - - - - - - - "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  ```
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  ```
                </button>
              </div>
              {errors.password && (
                ```
                <p className="mt-2 text-sm text-red-500">{errors.password}</p>
                ```
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <a href="/auth/signup" className="text-blue-500 hover:text-blue-400 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

**7.2.3 OAuth Callback Handler (1 hour)**

```typescript
// New File: app/src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

**Supabase Dashboard Setup:**

1. Navigate to Authentication > Providers
2. Enable Google: Add OAuth Client ID and Secret from Google Cloud Console
3. Enable GitHub: Add OAuth App credentials from GitHub Settings
4. Set Redirect URLs: `https://yourdomain.com/auth/callback`

---

### 7.3 Performance \& Scale (10 hours)

#### What You're Getting:

- Blazing fast page loads (under 2 seconds)
- Smooth scrolling with 1000+ items
- Instant search and filtering
- Optimized database queries


#### Implementation Details:

**7.3.1 Code Splitting \& Lazy Loading (4 hours)**

```typescript
// Update: app/src/app/dashboard/tasks/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const CalendarView = dynamic(() => import('@/components/tasks/CalendarView'), {
  loading: () => <LoadingSkeleton type="calendar" />,
  ssr: false, // Calendar doesn't need SSR
});

const ProductivityCharts = dynamic(() => import('@/components/reports/ProductivityCharts'), {
  loading: () => <LoadingSkeleton type="charts" />,
  ssr: false,
});

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');

  return (
    <div>
      {/* View switcher */}
      <Suspense fallback={<LoadingSkeleton type={viewMode} />}>
        {viewMode === 'list' && <TaskList />}
        {viewMode === 'board' && <KanbanBoard />}
        {viewMode === 'calendar' && <CalendarView />}
      </Suspense>
    </div>
  );
}
```

```typescript
// New File: app/src/components/LoadingSkeleton.tsx
export function LoadingSkeleton({ type }: { type: 'list' | 'board' | 'calendar' | 'charts' }) {
  if (type === 'calendar') {
    return (
      <div className="animate-pulse space-y-4">
        ```
        <div className="h-12 bg-slate-800 rounded-xl"></div>
        ```
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            ```
            <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
            ```
          ))}
        </div>
      </div>
    );
  }

  if (type === 'charts') {
    return (
      <div className="grid grid-cols-2 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          ```
          <div key={i} className="h-64 bg-slate-800 rounded-xl"></div>
          ```
        ))}
      </div>
    );
  }

  // Default list skeleton
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(10)].map((_, i) => (
        ```
        <div key={i} className="h-16 bg-slate-800 rounded-xl"></div>
        ```
      ))}
    </div>
  );
}
```

**7.3.2 Virtual Scrolling (3 hours)**

```bash
npm install react-window react-window-infinite-loader --save
```

```typescript
// Update: app/src/components/tasks/TaskList.tsx
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function VirtualizedTaskList({ tasks, onTaskClick }: TaskListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index];
    
    return (
      <div style={style} className="px-4">
        <TaskRow task={task} onClick={() => onTaskClick(task)} />
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-200px)]">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={tasks.length}
            itemSize={80} // Height of each task row
            width={width}
            overscanCount={5} // Render 5 extra items outside viewport
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
```

**7.3.3 Debounced Search (1 hour)**

```typescript
// New File: app/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

```typescript
// Usage in TasksPage
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedSearch) {
    // Trigger search API call
    searchTasks(debouncedSearch);
  }
}, [debouncedSearch]);

return (
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search tasks..."
  />
);
```

**7.3.4 Database Indexing (2 hours)**

```sql
-- New File: database/migrations/007_performance_indexes.sql

-- Index for workspace-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);

-- Index for project-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_priority ON tasks(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due ON tasks(workspace_id, due_date);

-- Index for date-range queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(start_time);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Statistics update for better query planning
ANALYZE tasks;
ANALYZE projects;
ANALYZE notes;
ANALYZE time_entries;
```

**Run Migration:**

```bash
supabase db push
```


---

### 7.4 Security Hardening (10 hours)

#### What You're Getting:

- Bank-level security for all data
- Protection against common attacks
- Rate limiting to prevent abuse
- Comprehensive audit trail


#### Implementation Details:

**7.4.1 API Route Security Audit (5 hours)**

```typescript
// New File: app/src/lib/auth-guard.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  workspaceId: string;
  userRole: 'admin' | 'member';
}

export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get workspace from request (query param or body)
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId') || 
    (await request.json().catch(() => ({}))).workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
  }

  // Check workspace membership
  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  return {
    user: { id: user.id, email: user.email! },
    workspaceId,
    userRole: membership.role as 'admin' | 'member',
  };
}

export async function requireAdmin(request: Request): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  if (authResult.userRole !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return authResult;
}
```

**Apply to All Routes:**

```typescript
// Update: app/src/app/api/tasks/route.ts
import { requireAuth } from '@/lib/auth-guard';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth; // Error response

  // Now we have authenticated context
  const { workspaceId, user } = auth;

  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId); // Guaranteed to be user's workspace

  return NextResponse.json(data);
}
```

**7.4.2 Rate Limiting (3 hours)**

```bash
npm install @upstash/ratelimit @upstash/redis --save
```

```typescript
// New File: app/src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client (Upstash free tier: 10k requests/day)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limits for different operations
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
});

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 login attempts per hour
  analytics: true,
});

export const inviteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'), // 10 invites per day
  analytics: true,
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit = apiLimiter
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  
  return { success, limit, remaining, reset };
}
```

**Apply to Routes:**

```typescript
// Update: app/src/app/api/invitations/route.ts
import { inviteLimiter, checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  // Rate limit by user ID
  const { success, remaining, reset } = await checkRateLimit(
    `invite_${auth.user.id}`,
    inviteLimiter
  );

  if (!success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: reset,
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // Proceed with invitation
  // ...
}
```

**Environment Setup:**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Get Free Upstash Account:**

1. Visit https://upstash.com
2. Create account (free tier)
3. Create Redis database
4. Copy REST URL and Token

**7.4.3 Database Constraints (2 hours)**

```sql
-- New File: database/migrations/008_security_constraints.sql

-- Ensure valid priority values
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Ensure workspace_id is never null
ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE notes ALTER COLUMN workspace_id SET NOT NULL;

-- Ensure valid user roles
ALTER TABLE workspace_members 
  ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('admin', 'member'));

-- Ensure valid task status
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (
    (is_completed = true AND completed_at IS NOT NULL) OR
    (is_completed = false AND completed_at IS NULL)
  );

-- Ensure due_date is not in the past for new tasks
ALTER TABLE tasks
  ADD CONSTRAINT tasks_due_date_check
  CHECK (due_date IS NULL OR due_date >= CURRENT_DATE);

-- Ensure positive time entries
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_duration_check
  CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) > 0);

-- Unique invitation per email per workspace
ALTER TABLE invitations
  ADD CONSTRAINT invitations_unique
  UNIQUE (workspace_id, email);
```


---

## PHASE 8: Notes System Overhaul

**Priority:** HIGH
**Timeline:** Week 2 (30-35 hours)
**Goal:** Transform Notes into Notion-level editor

### 8.1 Rich Text Editor Upgrade (15 hours)

#### What You're Getting:

- Block-based editor like Notion
- Full formatting toolbar (headings, lists, code, etc.)
- Slash commands for quick block creation
- Drag-and-drop block reordering
- Markdown shortcuts support


#### Implementation Details:

**8.1.1 Install Tiptap (1 hour)**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-image @tiptap/extension-code-block-lowlight @tiptap/extension-task-list @tiptap/extension-task-item lowlight --save
```

**8.1.2 Create Rich Editor Component (8 hours)**

```typescript
// New File: app/src/components/notes/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { lowlight } from 'lowlight';
import { 
  Bold, Italic, Code, List, ListOrdered, 
  Heading1, Heading2, Heading3, Quote, CodeSquare,
  Undo, Redo, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'Start writing...',
  editable = true 
}: RichTextEditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels:,[^6_1][^6_2][^6_3]
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-slate-800 rounded-lg p-4 my-4',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none px-8 py-4',
      },
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold className="w-4 h-4" />}
            tooltip="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic className="w-4 h-4" />}
            tooltip="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            icon={<Code className="w-4 h-4" />}
            tooltip="Inline code"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 className="w-4 h-4" />}
            tooltip="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 className="w-4 h-4" />}
            tooltip="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            icon={<Heading3 className="w-4 h-4" />}
            tooltip="Heading 3"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List className="w-4 h-4" />}
            tooltip="Bullet list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered className="w-4 h-4" />}
            tooltip="Numbered list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            ```
            icon={<span className="text-xs">☑</span>}
            ```
            tooltip="Task list"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            icon={<Quote className="w-4 h-4" />}
            tooltip="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            icon={<CodeSquare className="w-4 h-4" />}
            tooltip="Code block"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            icon={<LinkIcon className="w-4 h-4" />}
            tooltip="Add link"
          />
          <ToolbarButton
            onClick={addImage}
            icon={<ImageIcon className="w-4 h-4" />}
            tooltip="Add image"
          />

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="w-4 h-4" />}
            tooltip="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="w-4 h-4" />}
            tooltip="Redo (Ctrl+Shift+Z)"
          />
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ 
  onClick, 
  active, 
  disabled, 
  icon, 
  tooltip 
}: { 
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`p-2 rounded-lg transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  );
}
```

**8.1.3 Slash Commands Extension (4 hours)**

```typescript
// New File: app/src/components/notes/extensions/slash-commands.ts
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { CommandsList } from './CommandsList';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return [
            {
              title: 'Heading 1',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 1 })
                  .run();
              },
            },
            {
              title: 'Heading 2',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 2 })
                  .run();
              },
            },
            {
              title: 'Heading 3',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 3 })
                  .run();
              },
            },
            {
              title: 'Bullet List',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleBulletList()
                  .run();
              },
            },
            {
              title: 'Numbered List',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleOrderedList()
                  .run();
              },
            },
            {
              title: 'Task List',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleTaskList()
                  .run();
              },
            },
            {
              title: 'Code Block',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleCodeBlock()
                  .run();
              },
            },
            {
              title: 'Quote',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleBlockquote()
                  .run();
              },
            },
            {
              title: 'Divider',
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setHorizontalRule()
                  .run();
              },
            },
          ].filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandsList, {
                props,
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props: any) {
              component.updateProps(props);
              popup.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup.hide();
                return true;
              }
              return component.ref?.onKeyDown(props);
            },

            onExit() {
              popup.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
```

```typescript
// New File: app/src/components/notes/extensions/CommandsList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export const CommandsList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            key={index}
            onClick={() => selectItem(index)}
            className={`w-full px-4 py-2 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {item.title}
          </button>
        ))
      ) : (
        ```
        <div className="px-4 py-2 text-slate-500">No results</div>
        ```
      )}
    </div>
  );
});

CommandsList.displayName = 'CommandsList';
```

**8.1.4 Update Notes Page (2 hours)**

```typescript
// Update: app/src/app/dashboard/notes/page.tsx
import RichTextEditor from '@/components/notes/RichTextEditor';

export default function NotesPage() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');

  const handleSave = async () => {
    if (!selectedNote) return;

    const { error } = await supabase
      .from('notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', selectedNote.id);

    if (!error) {
      // Show success toast
    }
  };

  return (
    <div className="flex h-screen">
      {/* Notes sidebar */}
      <div className="w-80 border-r border-slate-800">
        {/* ... notes list ... */}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        {selectedNote ? (
          <div className="max-w-4xl mx-auto py-8">
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
              className="text-4xl font-bold bg-transparent border-none outline-none text-white mb-8 w-full"
              placeholder="Untitled"
            />
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing with '/' for commands..."
            />

            <button
              onClick={handleSave}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Select a note to start editing
          </div>
        )}
      </div>
    </div>
  );
}
```


---

### 8.2 Advanced Note Features (12 hours)

#### What You're Getting:

- Nested pages (hierarchy of notes)
- Wiki-style links between notes and tasks
- Smart tags with auto-completion
- Reusable templates
- Full version history with restore


#### Implementation Details:

**8.2.1 Database Schema Updates (2 hours)**

```sql
-- New File: database/migrations/009_notes_advanced.sql

-- Add parent_id for nested notes
ALTER TABLE notes ADD COLUMN parent_id UUID REFERENCES notes(id) ON DELETE CASCADE;
CREATE INDEX idx_notes_parent ON notes(parent_id);

-- Bi-directional links table
CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  link_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either target_note_id OR target_task_id must be set
  CONSTRAINT note_links_target_check CHECK (
    (target_note_id IS NOT NULL AND target_task_id IS NULL) OR
    (target_note_id IS NULL AND target_task_id IS NOT NULL)
  )
);

CREATE INDEX idx_note_links_source ON note_links(source_note_id);
CREATE INDEX idx_note_links_target_note ON note_links(target_note_id);
CREATE INDEX idx_note_links_target_task ON note_links(target_task_id);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- Hex color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, name)
);

-- Note-Tag junction
CREATE TABLE note_tags (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (note_id, tag_id)
);

-- Templates table
CREATE TABLE note_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- HTML content
  category TEXT DEFAULT 'general', -- meeting, project, brainstorm, etc.
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_templates_workspace ON note_templates(workspace_id);

-- Version history
CREATE TABLE note_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_versions_note ON note_versions(note_id, version_number DESC);

-- Auto-increment version number
CREATE OR REPLACE FUNCTION increment_note_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO note_versions (note_id, content, title, version_number, created_by)
  SELECT 
    NEW.id,
    OLD.content,
    OLD.title,
    COALESCE((SELECT MAX(version_number) FROM note_versions WHERE note_id = NEW.id), 0) + 1,
    NEW.updated_by
  WHERE OLD.content IS DISTINCT FROM NEW.content; -- Only if content changed
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_version_trigger
AFTER UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION increment_note_version();

-- RLS Policies
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Policies (allow workspace members to access)
CREATE POLICY "Workspace members can manage links" ON note_links
  USING (
    source_note_id IN (
      SELECT n.id FROM notes n
      INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage tags" ON tags
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage note_tags" ON note_tags
  USING (
    note_id IN (
      SELECT n.id FROM notes n
      INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can access templates" ON note_templates
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can view versions" ON note_versions
  USING (
    note_id IN (
      SELECT n.id FROM notes n
      INNER JOIN workspace_members wm ON wm.workspace_id = n.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );
```

**8.2.2 Nested Notes UI (3 hours)**

```typescript
// New File: app/src/components/notes/NotesTree.tsx
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Plus, Folder } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  parent_id: string | null;
  children?: Note[];
}

interface NotesTreeProps {
  workspaceId: string;
  onSelectNote: (note: Note) => void;
  selectedNoteId?: string;
}

export default function NotesTree({ workspaceId, onSelectNote, selectedNoteId }: NotesTreeProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotes();
  }, [workspaceId]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('id, title, parent_id')
      .eq('workspace_id', workspaceId)
      .order('title');

    if (data) {
      const tree = buildTree(data);
      setNotes(tree);
    }
  };

  const buildTree = (flatNotes: Note[]): Note[] => {
    const map = new Map<string, Note>();
    const roots: Note[] = [];

    // Initialize map
    flatNotes.forEach(note => {
      map.set(note.id, { ...note, children: [] });
    });

    // Build tree
    flatNotes.forEach(note => {
      const node = map.get(note.id)!;
      if (note.parent_id) {
        const parent = map.get(note.parent_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node); // Parent deleted, promote to root
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const createChildNote = async (parentId: string) => {
    const { data } = await supabase
      .from('notes')
      .insert({
        title: 'Untitled',
        content: '',
        workspace_id: workspaceId,
        parent_id: parentId,
      })
      .select()
      .single();

    if (data) {
      loadNotes();
      onSelectNote(data);
    }
  };

  const TreeNode = ({ note, depth = 0 }: { note: Note; depth?: number }) => {
    const hasChildren = note.children && note.children.length > 0;
    const isExpanded = expandedIds.has(note.id);
    const isSelected = note.id === selectedNoteId;

    return (
      <div>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group ${
            isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => onSelectNote(note)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(note.id);
              }}
              className="p-0.5 hover:bg-slate-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {hasChildren ? (
            <Folder className="w-4 h-4 flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 flex-shrink-0" />
          )}

          ```
          <span className="flex-1 truncate text-sm">{note.title}</span>
          ```

          <button
            onClick={(e) => {
              e.stopPropagation();
              createChildNote(note.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded"
            title="Add child note"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {note.children!.map((child) => (
              <TreeNode key={child.id} note={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {notes.map((note) => (
        <TreeNode key={note.id} note={note} />
      ))}
    </div>
  );
}
```

**8.2.3 Wiki Links Extension (4 hours)**

```typescript
// New File: app/src/components/notes/extensions/wiki-link.ts
import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const WikiLink = Mark.create({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'wiki-link',
      },
    };
  },

  addAttributes() {
    return {
      targetId: {
        default: null,
      },
      targetType: {
        default: 'note', // 'note' or 'task'
      },
      linkText: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-wiki-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-wiki-link': '',
        href: '#',
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLinkHandler'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.hasAttribute('data-wiki-link')) {
                event.preventDefault();
                const targetId = target.getAttribute('data-target-id');
                const targetType = target.getAttribute('data-target-type');
                
                // Emit event to open linked note/task
                window.dispatchEvent(
                  new CustomEvent('wiki-link-click', {
                    detail: { targetId, targetType },
                  })
                );
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
```

```typescript
// Add autocomplete for [[links]]
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const WikiLinkSuggestion = Extension.create({
  name: 'wikiLinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        items: async ({ query }: { query: string }) => {
          // Search notes and tasks
          const { data: notes } = await supabase
            .from('notes')
            .select('id, title')
            .ilike('title', `%${query}%`)
            .limit(10);

          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title')
            .ilike('title', `%${query}%`)
            .limit(5);

          return [
            ...(notes || []).map(n => ({ ...n, type: 'note' })),
            ...(tasks || []).map(t => ({ ...t, type: 'task' })),
          ];
        },
        render: () => {
          // Similar to slash commands dropdown
        },
        command: ({ editor, range, props }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setMark('wikiLink', {
              targetId: props.id,
              targetType: props.type,
              linkText: props.title,
            })
            .insertContent(`${props.title}]]`)
            .run();

          // Save link to database
          saveNoteLink(editor.getAttributes('note').id, props.id, props.type, props.title);
        },
      }),
    ];
  },
});

async function saveNoteLink(
  sourceNoteId: string,
  targetId: string,
  targetType: 'note' | 'task',
  linkText: string
) {
  await supabase.from('note_links').insert({
    source_note_id: sourceNoteId,
    [`target_${targetType}_id`]: targetId,
    link_text: linkText,
  });
}
```

**8.2.4 Tags System (3 hours)**

```typescript
// New File: app/src/components/notes/TagsInput.tsx
import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsInputProps {
  noteId: string;
  workspaceId: string;
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagsInput({ noteId, workspaceId, selectedTags, onChange }: TagsInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadTags();
  }, [workspaceId]);

  const loadTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (data) setAllTags(data);
  };

  const filteredTags = allTags.filter(
    tag =>
      tag.name.toLowerCase().includes(input.toLowerCase()) &&
      !selectedTags.find(t => t.id === tag.id)
  );

  const addTag = async (tag: Tag) => {
    // Add to junction table
    await supabase.from('note_tags').insert({
      note_id: noteId,
      tag_id: tag.id,
    });

    onChange([...selectedTags, tag]);
    setInput('');
    setShowSuggestions(false);
  };

  const createAndAddTag = async () => {
    if (!input.trim()) return;

    // Create new tag
    const { data } = await supabase
      .from('tags')
      .insert({
        workspace_id: workspaceId,
        name: input.trim(),
        color: getRandomColor(),
      })
      .select()
      .single();

    if (data) {
      await addTag(data);
      loadTags();
    }
  };

  const removeTag = async (tagId: string) => {
    await supabase
      .from('note_tags')
      .delete()
      .eq('note_id', noteId)
      .eq('tag_id', tagId);

    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded-xl">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
            style={{ backgroundColor: tag.color }}
          >
            #{tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              className="hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredTags.length === 0) {
              createAndAddTag();
            }
          }}
          placeholder="Add tag..."
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white text-sm"
        />
      </div>

      {showSuggestions && input && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-48 overflow-auto">
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => addTag(tag)}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                ```
                <span className="text-white">#{tag.name}</span>
                ```
              </button>
            ))
          ) : (
            <button
              onClick={createAndAddTag}
              className="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-blue-400"
            >
              <Plus className="w-4 h-4" />
              Create "{input}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getRandomColor() {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
```


---

### 8.3 Collaboration \& Sharing (8 hours)

#### What You're Getting:

- Real-time collaborative editing (multiple people editing same note)
- Comments on specific note blocks
- Public share links (view-only)
- Export to PDF with formatting


#### Implementation Details:

**8.3.1 Real-time Collaboration (4 hours)**

```bash
npm install yjs y-websocket y-prosemirror --save
```

```typescript
// New File: app/src/components/notes/CollaborativeEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useState } from 'react';

interface CollaborativeEditorProps {
  noteId: string;
  userId: string;
  userName: string;
}

export default function CollaborativeEditor({ noteId, userId, userName }: CollaborativeEditorProps) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);

  useEffect(() => {
    // Create Yjs document
    const ydoc = new Y.Doc();
    
    // Connect to WebSocket server (we'll set this up with Supabase Realtime)
    const wsProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https', 'wss'),
      `note-${noteId}`,
      ydoc,
      {
        params: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    );

    setDoc(ydoc);
    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [noteId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Yjs handles history
      }),
      Collaboration.configure({
        document: doc!,
      }),
      CollaborationCursor.configure({
        provider: provider!,
        user: {
          name: userName,
          color: getUserColor(userId),
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none px-8 py-4',
      },
    },
  }, [doc, provider]);

```

if (!editor) return <div>Loading collaborative editor...</div>;

```

return (
  <div>
    {/* Show active users */}
    <div className="flex items-center gap-2 mb-4 px-8">
      ```
      <span className="text-sm text-slate-400">Editing with:</span>
      ```
      {provider?.awareness.getStates().size > 1 && (
        <div className="flex -space-x-2">
          {Array.from(provider.awareness.getStates().values()).map((state: any, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white border-2 border-slate-900"
              style={{ backgroundColor: state.user?.color }}
              title={state.user?.name}
            >
              {state.user?.name?.?.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>

    <EditorContent editor={editor} />
  </div>
);
}

function getUserColor(userId: string): string {
const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
return colors[hash % colors.length];
}
```

**Alternative: Simpler Real-time with Supabase (2 hours)**

```typescript
// Simpler approach using Supabase Realtime (operational transforms)
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useRealtimeNote(noteId: string) {
  const [content, setContent] = useState('');
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Subscribe to note changes
    const channel = supabase
      .channel(`note:${noteId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notes',
        filter: `id=eq.${noteId}`,
      }, (payload) => {
        setContent(payload.new.content);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setActiveUsers(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({ user_id: (await supabase.auth.getUser()).data.user?.id });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [noteId]);

  const updateContent = async (newContent: string) => {
    await supabase
      .from('notes')
      .update({ content: newContent })
      .eq('id', noteId);
  };

  return { content, updateContent, activeUsers };
}
```

**8.3.2 Public Share Links (2 hours)**

```sql
-- Add to notes table
ALTER TABLE notes ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE notes ADD COLUMN public_token UUID UNIQUE DEFAULT uuid_generate_v4();

-- Public view (no RLS)
CREATE OR REPLACE VIEW public_notes AS
SELECT id, title, content, created_at, public_token
FROM notes
WHERE is_public = true;
```

```typescript
// New File: app/src/app/public/note/[token]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import RichTextEditor from '@/components/notes/RichTextEditor';

export default async function PublicNotePage({ params }: { params: { token: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: note } = await supabase
    .from('public_notes')
    .select('*')
    .eq('public_token', params.token)
    .single();

  if (!note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          ```
          <h1 className="text-4xl font-bold text-white mb-8">{note.title}</h1>
          ```
          
          <RichTextEditor
            content={note.content}
            onChange={() => {}} // Read-only
            editable={false}
          />

          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-slate-400 text-sm">
            Created with{' '}
            <a href="/" className="text-blue-500 hover:underline">
              WorkHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// Add share button to editor
const shareNote = async () => {
  const { data } = await supabase
    .from('notes')
    .update({ is_public: true })
    .eq('id', noteId)
    .select('public_token')
    .single();

  if (data) {
    const shareUrl = `${window.location.origin}/public/note/${data.public_token}`;
    navigator.clipboard.writeText(shareUrl);
    // Show toast: "Link copied to clipboard!"
  }
};
```

**8.3.3 Export to PDF (2 hours)**

```bash
npm install jspdf html2canvas --save
```

```typescript
// New File: app/src/lib/pdf-export.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportNoteToPDF(noteId: string, title: string, htmlContent: string) {
  // Create temporary container
  const container = document.createElement('div');
  container.style.width = '210mm'; // A4 width
  container.style.padding = '20mm';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.className = 'prose prose-lg max-w-none';
  container.innerHTML = `
    ```
    <h1 style="margin-bottom: 2rem;">${title}</h1>
    ```
    ${htmlContent}
  `;
  
  document.body.appendChild(container);

  // Convert to canvas
  const canvas = await html2canvas(container, {
    scale: 2, // High quality
    useCORS: true,
  });

  document.body.removeChild(container);

  // Create PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= 297; // A4 height

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;
  }

  pdf.save(`${title}.pdf`);
}
```

```typescript
// Add export button
<button
  onClick={() => exportNoteToPDF(note.id, note.title, note.content)}
  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
>
  Export to PDF
</button>
```


---

## PHASE 9: Plans Feature

**Priority:** HIGH
**Timeline:** Week 3 (25-30 hours)
**Goal:** Add strategic planning layer above tasks

### 9.1 Plans Database \& UI (10 hours)

#### What You're Getting:

- Strategic planning workspace (roadmaps, OKRs, quarters)
- Gantt-style timeline visualization
- Milestones with progress tracking
- Link tasks to plan milestones


#### Implementation Details:

**9.1.1 Database Schema (2 hours)**

```sql
-- New File: database/migrations/010_plans.sql

-- Plans table
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT, -- Strategic goal (e.g., "Launch v2.0", "Hit $100k ARR")
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  owner_id UUID REFERENCES profiles(id),
  color TEXT DEFAULT '#3b82f6', -- For visual distinction
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_workspace ON plans(workspace_id);
CREATE INDEX idx_plans_status ON plans(status);

-- Milestones table
CREATE TABLE plan_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_plan ON plan_milestones(plan_id);
CREATE INDEX idx_milestones_date ON plan_milestones(target_date);

-- Junction: Link tasks to plan milestones
CREATE TABLE milestone_tasks (
  milestone_id UUID NOT NULL REFERENCES plan_milestones(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (milestone_id, task_id)
);

-- Auto-calculate milestone completion from tasks
CREATE OR REPLACE FUNCTION update_milestone_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  milestone_id_var UUID;
BEGIN
  -- Get milestone from old or new task
  SELECT mt.milestone_id INTO milestone_id_var
  FROM milestone_tasks mt
  WHERE mt.task_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;

  IF milestone_id_var IS NOT NULL THEN
    -- Count tasks
    SELECT COUNT(*), COUNT(*) FILTER (WHERE t.is_completed)
    INTO total_tasks, completed_tasks
    FROM milestone_tasks mt
    INNER JOIN tasks t ON t.id = mt.task_id
    WHERE mt.milestone_id = milestone_id_var;

    -- Update milestone
    UPDATE plan_milestones
    SET 
      completion_percentage = CASE 
        WHEN total_tasks = 0 THEN 0
        ELSE (completed_tasks * 100 / total_tasks)
      END,
      is_completed = (completed_tasks = total_tasks AND total_tasks > 0),
      completed_at = CASE
        WHEN (completed_tasks = total_tasks AND total_tasks > 0) THEN NOW()
        ELSE NULL
      END
    WHERE id = milestone_id_var;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER milestone_completion_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_milestone_completion();

-- RLS Policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage plans" ON plans
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage milestones" ON plan_milestones
  USING (
    plan_id IN (
      SELECT p.id FROM plans p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can link tasks" ON milestone_tasks
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );
```

**9.1.2 Plans List Page (4 hours)**

```typescript
// New File: app/src/app/dashboard/plans/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, Target, TrendingUp } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format, differenceInDays } from 'date-fns';

interface Plan {
  id: string;
  name: string;
  description: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  color: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  name: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select(`
        *,
        milestones:plan_milestones(*)
      `)
      .order('start_date', { ascending: false });

    if (data) setPlans(data);
  };

  const getOverallProgress = (plan: Plan) => {
    if (!plan.milestones || plan.milestones.length === 0) return 0;
    
    const totalPercentage = plan.milestones.reduce(
      (sum, m) => sum + m.completion_percentage,
      0
    );
    return Math.round(totalPercentage / plan.milestones.length);
  };

  const getDaysRemaining = (plan: Plan) => {
    return differenceInDays(new Date(plan.end_date), new Date());
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          ```
          <h1 className="text-3xl font-bold text-white mb-2">Plans</h1>
          ```
          ```
          <p className="text-slate-400">Strategic roadmaps and quarterly goals</p>
          ```
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Plan
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Active Plans"
          value={plans.filter(p => p.status === 'active').length}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={plans.filter(p => p.status === 'completed').length}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Total Milestones"
          value={plans.reduce((sum, p) => sum + (p.milestones?.length || 0), 0)}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          label="Avg Progress"
          value={`${Math.round(plans


<div align="center">⁂</div>

[^6_1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/70732981/2e19a42f-5ceb-4e01-956f-f6bb2239c669/COMPLETE_IMPLEMENTATION_PLAN.md
[^6_2]: https://github.com/Gordana1005/workhub
[^6_3]: https://www.notion.com/releases

---

# continue

```markdown
.reduce((sum, p) => sum + getOverallProgress(p), 0) / plans.length || 0)}%`
          icon={<TrendingUp className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map(plan => (
          <div
            key={plan.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors cursor-pointer"
            onClick={() => window.location.href = `/dashboard/plans/${plan.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: plan.color }}
                />
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              </div>
              
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  plan.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : plan.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-slate-500/10 text-slate-500'
                }`}
              >
                {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              </span>
            </div>

            {plan.description && (
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{plan.description}</p>
            )}

            {plan.goal && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg">
                <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{plan.goal}</span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Progress</span>
                <span className="text-sm font-medium text-white">{getOverallProgress(plan)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${getOverallProgress(plan)}%` }}
                />
              </div>
            </div>

            {/* Milestones Count */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  {plan.milestones?.length || 0} milestones
                </span>
                <span className="text-slate-400">
                  {plan.milestones?.filter(m => m.is_completed).length || 0} completed
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-4 h-4" />
                {getDaysRemaining(plan) > 0 ? (
                  <span>{getDaysRemaining(plan)} days left</span>
                ) : (
                  <span className="text-red-500">Overdue</span>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
              {format(new Date(plan.start_date), 'MMM d, yyyy')} →{' '}
              {format(new Date(plan.end_date), 'MMM d, yyyy')}
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No plans yet</h3>
          <p className="text-slate-400 mb-6">Create your first strategic plan to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Create Plan
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className={`inline-flex p-3 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
```

**9.1.3 Gantt Timeline View (4 hours)**

```typescript
// New File: app/src/components/plans/GanttChart.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, differenceInDays } from 'date-fns';

interface GanttItem {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  type: 'plan' | 'milestone';
  dependencies?: string[];
}

interface GanttChartProps {
  items: GanttItem[];
  onItemClick?: (item: GanttItem) => void;
  onDateChange?: (itemId: string, newStart: Date, newEnd: Date) => void;
}

export default function GanttChart({ items, onItemClick, onDateChange }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const containerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  // Calculate date range
  const allDates = items.flatMap(item => [item.startDate, item.endDate]);
  const minDate = startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...allDates.map(d => d.getTime()))));
  
  const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });
  const totalDays = dateRange.length;

  // Column width based on view mode
  const dayWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 20 : 10;
  const chartWidth = totalDays * dayWidth;

  const getItemPosition = (item: GanttItem) => {
    const startOffset = differenceInDays(item.startDate, minDate);
    const duration = differenceInDays(item.endDate, item.startDate) + 1;
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth,
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-white">Timeline View</h3>
        
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="overflow-auto" style={{ maxHeight: '600px' }}>
        <div className="flex">
          {/* Row Labels */}
          <div className="sticky left-0 z-10 bg-slate-900 border-r border-slate-800" style={{ minWidth: '240px' }}>
            {/* Header spacer */}
            <div className="h-12 border-b border-slate-800" />
            
            {/* Item names */}
            {items.map(item => (
              <div
                key={item.id}
                className="h-16 flex items-center px-4 border-b border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-white font-medium truncate">
                    {item.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Grid */}
          <div style={{ width: chartWidth, minWidth: chartWidth }}>
            {/* Date Headers */}
            <div className="h-12 flex border-b border-slate-800">
              {dateRange.map((date, i) => {
                const isFirstOfMonth = date.getDate() === 1;
                const showLabel = viewMode === 'month' ? isFirstOfMonth : i % 7 === 0;

                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 flex items-center justify-center border-r border-slate-800/50 ${
                      isFirstOfMonth ? 'border-l-2 border-l-slate-700' : ''
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {showLabel && (
                      <span className="text-xs text-slate-500 font-medium">
                        {format(date, viewMode === 'day' ? 'd' : 'MMM')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gantt Bars */}
            <div className="relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {dateRange.map((date, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r border-slate-800/30 ${
                      date.getDate() === 1 ? 'border-l-2 border-l-slate-700' : ''
                    } ${isSameDay(date, new Date()) ? 'bg-blue-500/5' : ''}`}
                    style={{ width: dayWidth }}
                  />
                ))}
              </div>

              {/* Items */}
              {items.map((item, index) => {
                const position = getItemPosition(item);

                return (
                  <div
                    key={item.id}
                    className="h-16 flex items-center border-b border-slate-800"
                  >
                    <div className="relative w-full h-full px-2 py-4">
                      <div
                        className="absolute h-8 rounded-lg cursor-pointer hover:opacity-80 transition-opacity group"
                        style={{
                          left: position.left + 8,
                          width: Math.max(position.width - 16, 40),
                          backgroundColor: item.color,
                        }}
                        onClick={() => onItemClick?.(item)}
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute inset-0 bg-white/20 rounded-lg transition-all"
                          style={{ width: `${item.progress}%` }}
                        />

                        {/* Label */}
                        <div className="relative h-full flex items-center px-3">
                          <span className="text-xs font-medium text-white truncate">
                            {item.name}
                          </span>
                          <span className="ml-auto text-xs text-white/80">
                            {item.progress}%
                          </span>
                        </div>

                        {/* Resize handles */}
                        {onDateChange && (
                          <>
                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30" />
                            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  left: differenceInDays(new Date(), minDate) * dayWidth,
                }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
                  <div className="px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap">
                    Today
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```


***

### 9.2 Plan Templates \& Smart Features (10 hours)

#### What You're Getting:

- Pre-built plan templates (Product Launch, Marketing Campaign, etc.)
- Auto-generate tasks from milestones
- Critical path analysis (highlight blockers)
- Plan vs Reality comparison


#### Implementation Details:

**9.2.1 Plan Templates (3 hours)**

```typescript
// New File: app/src/lib/plan-templates.ts
import { addDays, addWeeks, addMonths } from 'date-fns';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  duration_days: number;
  milestones: {
    name: string;
    description: string;
    offset_days: number; // Days from plan start
    tasks?: {
      title: string;
      description: string;
      estimated_hours: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }[];
  }[];
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Complete product launch plan from development to release',
    category: 'Product',
    duration_days: 90,
    milestones: [
      {
        name: 'Development Complete',
        description: 'All core features built and tested',
        offset_days: 30,
        tasks: [
          {
            title: 'Build MVP features',
            description: 'Implement core functionality',
            estimated_hours: 80,
            priority: 'urgent',
          },
          {
            title: 'Internal testing',
            description: 'QA and bug fixes',
            estimated_hours: 20,
            priority: 'high',
          },
          {
            title: 'Security audit',
            description: 'Penetration testing and fixes',
            estimated_hours: 16,
            priority: 'high',
          },
        ],
      },
      {
        name: 'Beta Launch',
        description: 'Invite first users and gather feedback',
        offset_days: 60,
        tasks: [
          {
            title: 'Set up analytics',
            description: 'Install tracking and monitoring',
            estimated_hours: 8,
            priority: 'high',
          },
          {
            title: 'Create onboarding flow',
            description: 'User tutorials and guides',
            estimated_hours: 16,
            priority: 'medium',
          },
          {
            title: 'Invite beta users',
            description: 'Send invitations and monitor adoption',
            estimated_hours: 4,
            priority: 'medium',
          },
        ],
      },
      {
        name: 'Public Launch',
        description: 'Official product release',
        offset_days: 90,
        tasks: [
          {
            title: 'Launch marketing campaign',
            description: 'Social media, blog posts, press release',
            estimated_hours: 24,
            priority: 'urgent',
          },
          {
            title: 'Monitor infrastructure',
            description: 'Ensure uptime and performance',
            estimated_hours: 8,
            priority: 'urgent',
          },
          {
            title: 'Customer support readiness',
            description: 'Set up help desk and docs',
            estimated_hours: 12,
            priority: 'high',
          },
        ],
      },
    ],
  },
  {
    id: 'quarterly-okrs',
    name: 'Quarterly OKRs',
    description: 'Objectives and Key Results for Q1-Q4',
    category: 'Strategy',
    duration_days: 90,
    milestones: [
      {
        name: 'Month 1: Foundation',
        description: 'Set objectives and baseline metrics',
        offset_days: 30,
        tasks: [
          {
            title: 'Define key objectives',
            description: 'Align team on quarterly goals',
            estimated_hours: 8,
            priority: 'urgent',
          },
          {
            title: 'Set measurable KRs',
            description: 'Define success metrics',
            estimated_hours: 4,
            priority: 'high',
          },
        ],
      },
      {
        name: 'Month 2: Execution',
        description: 'Drive progress on key results',
        offset_days: 60,
        tasks: [
          {
            title: 'Weekly check-ins',
            description: 'Track progress and adjust',
            estimated_hours: 2,
            priority: 'high',
          },
        ],
      },
      {
        name: 'Month 3: Review',
        description: 'Evaluate results and plan next quarter',
        offset_days: 90,
        tasks: [
          {
            title: 'OKR retrospective',
            description: 'What worked, what didn\'t',
            estimated_hours: 4,
            priority: 'medium',
          },
        ],
      },
    ],
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Complete marketing campaign from planning to analysis',
    category: 'Marketing',
    duration_days: 60,
    milestones: [
      {
        name: 'Campaign Planning',
        description: 'Strategy and content creation',
        offset_days: 15,
        tasks: [
          {
            title: 'Define target audience',
            description: 'Demographics and personas',
            estimated_hours: 4,
            priority: 'high',
          },
          {
            title: 'Create content calendar',
            description: 'Schedule posts and emails',
            estimated_hours: 8,
            priority: 'high',
          },
          {
            title: 'Design assets',
            description: 'Graphics, videos, copy',
            estimated_hours: 24,
            priority: 'medium',
          },
        ],
      },
      {
        name: 'Campaign Execution',
        description: 'Launch and monitor performance',
        offset_days: 45,
        tasks: [
          {
            title: 'Launch campaign',
            description: 'Publish across all channels',
            estimated_hours: 4,
            priority: 'urgent',
          },
          {
            title: 'Monitor metrics',
            description: 'Track engagement and conversions',
            estimated_hours: 16,
            priority: 'high',
          },
        ],
      },
      {
        name: 'Analysis & Optimization',
        description: 'Review results and iterate',
        offset_days: 60,
        tasks: [
          {
            title: 'Generate report',
            description: 'ROI and performance analysis',
            estimated_hours: 8,
            priority: 'medium',
          },
        ],
      },
    ],
  },
  {
    id: 'sprint-planning',
    name: 'Two-Week Sprint',
    description: 'Agile sprint from planning to retrospective',
    category: 'Development',
    duration_days: 14,
    milestones: [
      {
        name: 'Sprint Planning',
        description: 'Select and estimate stories',
        offset_days: 1,
      },
      {
        name: 'Sprint Review',
        description: 'Demo completed work',
        offset_days: 13,
      },
      {
        name: 'Sprint Retrospective',
        description: 'Team reflection and improvements',
        offset_days: 14,
      },
    ],
  },
];

export async function createPlanFromTemplate(
  templateId: string,
  workspaceId: string,
  projectId: string | null,
  startDate: Date,
  customName?: string
) {
  const template = PLAN_TEMPLATES.find(t => t.id === templateId);
  if (!template) throw new Error('Template not found');

  const supabase = createClientComponentClient();

  // Create plan
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      workspace_id: workspaceId,
      name: customName || template.name,
      description: template.description,
      start_date: startDate,
      end_date: addDays(startDate, template.duration_days),
      status: 'draft',
    })
    .select()
    .single();

  if (planError || !plan) throw planError;

  // Create milestones and tasks
  for (const milestoneTemplate of template.milestones) {
    const { data: milestone } = await supabase
      .from('plan_milestones')
      .insert({
        plan_id: plan.id,
        name: milestoneTemplate.name,
        description: milestoneTemplate.description,
        target_date: addDays(startDate, milestoneTemplate.offset_days),
      })
      .select()
      .single();

    if (milestone && milestoneTemplate.tasks) {
      // Create tasks
      const tasks = await Promise.all(
        milestoneTemplate.tasks.map(taskTemplate =>
          supabase
            .from('tasks')
            .insert({
              workspace_id: workspaceId,
              project_id: projectId,
              title: taskTemplate.title,
              description: taskTemplate.description,
              estimated_hours: taskTemplate.estimated_hours,
              priority: taskTemplate.priority,
              due_date: addDays(startDate, milestoneTemplate.offset_days),
            })
            .select()
            .single()
        )
      );

      // Link tasks to milestone
      await Promise.all(
        tasks
          .filter(t => t.data)
          .map(t =>
            supabase.from('milestone_tasks').insert({
              milestone_id: milestone.id,
              task_id: t.data!.id,
            })
          )
      );
    }
  }

  return plan;
}
```

**9.2.2 Template Selector Modal (2 hours)**

```typescript
// New File: app/src/components/plans/TemplateSelectorModal.tsx
import { useState } from 'react';
import { PLAN_TEMPLATES, PlanTemplate } from '@/lib/plan-templates';
import { X, Rocket, Target, TrendingUp, Code } from 'lucide-react';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string, startDate: Date, name: string) => void;
}

export default function TemplateSelectorModal({ isOpen, onClose, onSelect }: TemplateSelectorModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[^7_0]);
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Product': return <Rocket className="w-5 h-5" />;
      case 'Strategy': return <Target className="w-5 h-5" />;
      case 'Marketing': return <TrendingUp className="w-5 h-5" />;
      case 'Development': return <Code className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const handleCreate = () => {
    if (!selectedTemplate) return;
    onSelect(
      selectedTemplate.id,
      new Date(startDate),
      customName || selectedTemplate.name
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">Choose a Plan Template</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-1/2 border-r border-slate-800 overflow-auto p-6">
            <div className="space-y-3">
              {PLAN_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setCustomName(template.name);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedTemplate?.id === template.id
                        ? 'bg-white/20'
                        : 'bg-slate-700'
                    }`}>
                      {getCategoryIcon(template.category)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className={`text-sm ${
                        selectedTemplate?.id === template.id
                          ? 'text-blue-100'
                          : 'text-slate-500'
                      }`}>
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={selectedTemplate?.id === template.id ? 'text-blue-200' : 'text-slate-500'}>
                          {template.duration_days} days
                        </span>
                        <span className={selectedTemplate?.id === template.id ? 'text-blue-200' : 'text-slate-500'}>
                          {template.milestones.length} milestones
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Preview */}
          <div className="w-1/2 overflow-auto p-6">
            {selectedTemplate ? (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    placeholder="Enter plan name"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Milestones</h3>
                  <div className="space-y-3">
                    {selectedTemplate.milestones.map((milestone, index) => (
                      <div key={index} className="bg-slate-800 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{milestone.name}</h4>
                          <span className="text-xs text-slate-400">
                            Day {milestone.offset_days}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{milestone.description}</p>
                        {milestone.tasks && (
                          <div className="text-xs text-slate-500">
                            {milestone.tasks.length} tasks included
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  Create Plan from Template
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                Select a template to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**9.2.3 Critical Path Analysis (3 hours)**

```typescript
// New File: app/src/lib/critical-path.ts
interface Task {
  id: string;
  title: string;
  estimated_hours: number;
  dependencies: string[]; // Task IDs
  earliest_start?: number;
  earliest_finish?: number;
  latest_start?: number;
  latest_finish?: number;
  slack?: number;
  is_critical?: boolean;
}

export function calculateCriticalPath(tasks: Task[]): Task[] {
  // Create task map
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
  
  // Forward pass (calculate earliest start/finish)
  const visited = new Set<string>();
  
  function forwardPass(taskId: string): number {
    if (visited.has(taskId)) {
      return taskMap.get(taskId)!.earliest_finish!;
    }
    
    const task = taskMap.get(taskId)!;
    visited.add(taskId);
    
    // Calculate earliest start (max of all dependency finishes)
    task.earliest_start = 0;
    if (task.dependencies.length > 0) {
      task.earliest_start = Math.max(
        ...task.dependencies.map(depId => forwardPass(depId))
      );
    }
    
    task.earliest_finish = task.earliest_start + task.estimated_hours;
    return task.earliest_finish;
  }
  
  // Run forward pass on all tasks
  tasks.forEach(t => forwardPass(t.id));
  
  // Find project completion time
  const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earliest_finish!));
  
  // Backward pass (calculate latest start/finish)
  const visitedBackward = new Set<string>();
  
  function backwardPass(taskId: string): number {
    if (visitedBackward.has(taskId)) {
      return taskMap.get(taskId)!.latest_start!;
    }
    
    const task = taskMap.get(taskId)!;
    visitedBackward.add(taskId);
    
    // Find tasks that depend on this task
    const dependents = tasks.filter(t => t.dependencies.includes(taskId));
    
    if (dependents.length === 0) {
      // No dependents, this is an end task
      task.latest_finish = projectDuration;
    } else {
      // Latest finish is min of all dependent latest starts
      task.latest_finish = Math.min(
        ...dependents.map(dep => backwardPass(dep.id))
      );
    }
    
    task.latest_start = task.latest_finish - task.estimated_hours;
    return task.latest_start;
  }
  
  // Run backward pass
  tasks.forEach(t => backwardPass(t.id));
  
  // Calculate slack and identify critical path
  taskMap.forEach(task => {
    task.slack = task.latest_start! - task.earliest_start!;
    task.is_critical = task.slack === 0;
  });
  
  return Array.from(taskMap.values());
}

export function getCriticalPathTasks(tasks: Task[]): Task[] {
  const analyzed = calculateCriticalPath(tasks);
  return analyzed.filter(t => t.is_critical);
}

export function getProjectDuration(tasks: Task[]): number {
  const analyzed = calculateCriticalPath(tasks);
  return Math.max(...analyzed.map(t => t.earliest_finish!));
}
```

**9.2.4 Plan vs Reality Component (2 hours)**

```typescript
// New File: app/src/components/plans/PlanVsReality.tsx
import { useMemo } from 'react';
import { differenceInDays, format, isPast } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
  completed_at?: string;
}

interface PlanVsRealityProps {
  milestones: Milestone[];
}

export default function PlanVsReality({ milestones }: PlanVsRealityProps) {
  const analysis = useMemo(() => {
    const completed = milestones.filter(m => m.is_completed);
    const onTime = completed.filter(m => {
      if (!m.completed_at) return false;
      return new Date(m.completed_at) <= new Date(m.target_date);
    });
    const delayed = completed.filter(m => {
      if (!m.completed_at) return false;
      return new Date(m.completed_at) > new Date(m.target_date);
    });
    const upcoming = milestones.filter(m => !m.is_completed && !isPast(new Date(m.target_date)));
    const overdue = milestones.filter(m => !m.is_completed && isPast(new Date(m.target_date)));

    return { completed, onTime, delayed, upcoming, overdue };
  }, [milestones]);

  const getVariance = (milestone: Milestone) => {
    if (!milestone.is_completed || !milestone.completed_at) return null;
    const diff = differenceInDays(
      new Date(milestone.completed_at),
      new Date(milestone.target_date)
    );
    return diff;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Plan vs Reality</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-slate-400">On Time</span>
          </div>
          <div className="text-3xl font-bold text-green-500">{analysis.onTime.length}</div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-slate-400">Delayed</span>
          </div>
          <div className="text-3xl font-bold text-amber-500">{analysis.delayed.length}</div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-400">Upcoming</span>
          </div>
          <div className="text-3xl font-bold text-blue-500">{analysis.upcoming.length}</div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-slate-400">Overdue</span>
          </div>
          <div className="text-3xl font-bold text-red-500">{analysis.overdue.length}</div>
        </div>
      </div>

      {/* Detailed List */}
      <div className="space-y-3">
        {milestones.map(milestone => {
          const variance = getVariance(milestone);
          const isOverdue = !milestone.is_completed && isPast(new Date(milestone.target_date));
          const status = milestone.is_completed
            ? variance && variance > 0
              ? 'delayed'
              : 'on-time'
            : isOverdue
            ? 'overdue'
            : 'upcoming';

          return (
            <div key={milestone.id} className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">{milestone.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}</span>
                    {milestone.completed_at && (
                      <span>Completed: {format(new Date(milestone.completed_at), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'on-time'
                        ? 'bg-green-500/10 text-green-500'
                        : status === 'delayed'
                        ? 'bg-amber-500/10 text-amber-500'
                        : status === 'overdue'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {status === 'on-time' && 'On Time'}
                    {status === 'delayed' && `${variance} days late`}
                    {status === 'overdue' && 'Overdue'}
                    {status === 'upcoming' && `${differenceInDays(new Date(milestone.target_date), new Date())} days left`}
                  </span>

                  <div className="text-sm text-slate-400">
                    {milestone.completion_percentage}% complete
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    status === 'overdue'
                      ? 'bg-red-500'
                      : status === 'delayed'
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${milestone.completion_percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```


***

## PHASE 10: Finance Tracker

**Priority:** HIGH
**Timeline:** Week 4 (35-40 hours)
**Goal:** Complete personal and project finance management

### 10.1 Personal Finance Core (15 hours)

#### What You're Getting:

- Transaction tracking (income/expenses)
- Category-based budgeting
- Multi-account support (bank, cash, crypto)
- Natural language entry ("Spent \$50 on groceries")
- Visual dashboards with charts


#### Implementation Details:

**10.1.1 Database Schema (3 hours)**

```sql
-- New File: database/migrations/011_finance.sql

-- Accounts table
CREATE TABLE finance_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for shared workspace accounts
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'investment', 'crypto')),
  currency TEXT DEFAULT 'USD',
  initial_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE finance_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#3b82f6',
  icon TEXT, -- Icon name from lucide-react
  parent_id UUID REFERENCES finance_categories(id), -- For subcategories
  is_system BOOLEAN DEFAULT false, -- Pre-defined categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, name, type)
);

-- System categories (insert on workspace creation)
INSERT INTO finance_categories (workspace_id, name, type, icon, is_system) VALUES
  -- Expenses
  (NULL, 'Food & Dining', 'expense', 'utensils', true),
  (NULL, 'Transportation', 'expense', 'car', true),
  (NULL, 'Shopping', 'expense', 'shopping-bag', true),
  (NULL, 'Entertainment', 'expense', 'film', true),
  (NULL, 'Bills & Utilities', 'expense', 'receipt', true),
  (NULL, 'Healthcare', 'expense', 'heart', true),
  (NULL, 'Education', 'expense', 'book', true),
  (NULL, 'Travel', 'expense', 'plane', true),
  (NULL, 'Business', 'expense', 'briefcase', true),
  (NULL, 'Other', 'expense', 'more-horizontal', true),
  -- Income
  (NULL, 'Salary', 'income', 'briefcase', true),
  (NULL, 'Freelance', 'income', 'laptop', true),
  (NULL, 'Investment', 'income', 'trending-up', true),
  (NULL, 'Business', 'income', 'store', true),
  (NULL, 'Other', 'income', 'dollar-sign', true);

-- Transactions table
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),
  project_id UUID REFERENCES projects(id), -- Link to project for business expenses
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- Same structure as task recurrence
  tags TEXT[], -- Array of tags
  receipt_url TEXT, -- Link to file storage
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_account ON finance_transactions(account_id);
CREATE INDEX idx_transactions_category ON finance_transactions(category_id);
CREATE INDEX idx_transactions_date ON finance_transactions(date DESC);
CREATE INDEX idx_transactions_project ON finance_transactions(project_id);
CREATE INDEX idx_transactions_type ON finance_transactions(type);

-- Update account balance trigger
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction
    UPDATE finance_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END
    WHERE id = OLD.account_id;
    
    -- Apply new transaction
    UPDATE finance_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END
    WHERE id = OLD.account_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Budgets table
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100), -- Alert at 80% spent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE finance_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage accounts" ON finance_accounts
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Workspace members can view categories" ON finance_categories
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR is_system = true
  );

CREATE POLICY "Workspace members can manage transactions" ON finance_transactions
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage budgets" ON finance_budgets
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own goals" ON finance_goals
  USING (user_id = auth.uid());
```

**10.1.2 Finance Dashboard (6 hours)**

```typescript
// New File: app/src/app/dashboard/finance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';

export default function FinancePage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    // Load accounts
    const { data: accountsData } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true);

    if (accountsData) {
      setAccounts(accountsData);
      const total = accountsData.reduce((sum, acc) => sum + parseFloat(acc.current_balance), 0);
      setStats(prev => ({ ...prev, totalBalance: total }));
    }

    // Load this month's transactions
    const startDate = startOfMonth(new Date());
    const endDate = endOfMonth(new Date());

    const { data: transData } = await supabase
      .from('finance_transactions')
      .select('*, category:finance_categories(*)')
      .gte('date', startDate.toISOString().split('T')[^7_0])
      .lte('date', endDate.toISOString().split('T')[^7_0])
      .order('date', { ascending: false });

    if (transData) {
      setTransactions(transData);
      
      const income = transData
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const expenses = transData
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      setStats(prev => ({
        ...prev,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        netIncome: income - expenses,
      }));
    }
  };

  // Chart data
  const categoryData = transactions
    .filter(t => t.type === 'expense' && t.category)
    .reduce((acc, t) => {
      const cat = t.category.name;
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Finance</h1>
          <p className="text-slate-400">Track income, expenses, and financial goals</p>
        </div>
        
        <button
          onClick={() => window.location.href = '/dashboard/finance/transactions/new'}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          Add Transaction
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Balance"
          value={`$${stats.totalBalance.toLocaleString()}`}
          icon={<Wallet className="w-6 h-6" />}
          trend={stats.netIncome >= 0 ? 'up' : 'down'}
          color="blue"
        />
        <StatCard
          label="Monthly Income"
          value={`$${stats.monthlyIncome.toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Monthly Expenses"
          value={`$${stats.monthlyExpenses.toLocaleString()}`}
          icon={<TrendingDown className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          label="Net Income"
          value={`$${stats.netIncome.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend={stats.netIncome >= 0 ? 'up' : 'down'}
          color={stats.netIncome >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Spending by Category */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3 max-h-[300px] overflow-auto">
            {transactions.slice(0, 10).map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transaction.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{transaction.description}</div>
                    <div className="text-sm text-slate-400">
                      {transaction.category?.name} · {format(new Date(transaction.date), 'MMM d')}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${
                  transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Accounts</h3>
        <div className="grid grid-cols-4 gap-4">
          {accounts.map(account => (
            <div key={account.id} className="bg-slate-800 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">{account.name}</div>
              <div className="text-2xl font-bold text-white mb-1">
                ${parseFloat(account.current_balance).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 capitalize">{account.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className={`inline-flex p-3 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-slate-400">{label}</div>
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}
```

**10.1.3 Natural Language Transaction Entry (3 hours)**

```typescript
// New File: app/src/lib/finance-parser.ts
import { parse } from 'chrono-node';

interface ParsedTransaction {
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'groceries', 'coffee', 'snack'],
  'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'train', 'bus', 'flight'],
  'Shopping': ['amazon', 'shopping', 'clothes', 'shoes', 'buy', 'purchase'],
  'Entertainment': ['movie', 'concert', 'game', 'netflix', 'spotify', 'entertainment'],
  'Bills & Utilities': ['rent', 'utilities', 'electricity', 'water', 'internet', 'phone', 'bill'],
  'Salary': ['salary', 'paycheck', 'wage'],
  'Freelance': ['freelance', 'gig', 'contract', 'consulting'],
};

export function parseNaturalLanguageTransaction(input: string): ParsedTransaction | null {
  const text = input.toLowerCase();
  
  // Extract amount
  const amountMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[^7_1].replace(',', ''));
  
  // Determine type (income vs expense)
  const isIncome = /earn|paid|receive|income|salary|freelance/i.test(text);
  const type = isIncome ? 'income' : 'expense';
  
  // Extract date
  const dateResults = parse(text);
  const date = dateResults.length > 0 ? dateResults[^7_0].start.date() : new Date();
  
  // Detect category
  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Extract description (remove amount and date-related words)
  let description = input
    .replace(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/, '')
    .replace(/yesterday|today|tomorrow|on|at|for/gi, '')
    .trim();
  
  if (!description) {
    description = isIncome ? 'Income' : 'Expense';
  }
  
  return {
    amount,
    description,
    category,
    date,
    type,
  };
}

// Examples:
// "Spent $50 on groceries yesterday" → { amount: 50, description: "groceries", category: "Food & Dining", date: yesterday, type: "expense" }
// "Earned $500 from freelance work" → { amount: 500, description: "freelance work", category: "Freelance", date: today, type: "income" }
// "$15 coffee at Starbucks" → { amount: 15, description: "coffee at Starbucks", category: "Food & Dining", date: today, type: "expense" }
```

```typescript
// New File: app/src/components/finance/QuickAddTransaction.tsx
import { useState } from 'react';
import { parseNaturalLanguageTransaction } from '@/lib/finance-parser';
import { Sparkles } from 'lucide-react';

export default function QuickAddTransaction({ onAdd }: { onAdd: (transaction: any) => void }) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<any>(null);

  const handleInputChange = (value: string) => {
    setInput(value);
    const parsed = parseNaturalLanguageTransaction(value);
    setPreview(parsed);
  };

  const handleSubmit = async () => {
    if (!preview) return;
    await onAdd(preview);
    setInput('');
    setPreview(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">Quick Add with AI</h3>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="e.g., 'Spent $50 on groceries yesterday'"
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white mb-4"
      />

      {preview && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Amount:</span>
              <span className="ml-2 text-white font-medium">${preview.amount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">Type:</span>
              <span className={`ml-2 font-medium ${preview.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {preview.type}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Category:</span>
              <span className="ml-2 text-white">{preview.category || 'Other'}</span>
            </div>
            <div>
              <span className="text-slate-400">Date:</span>
              <span className="ml-2 text-white">{preview.date.toLocaleDateString()}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Description:</span>
              <span className="ml-2 text-white">{preview.description}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!preview}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
      >
        Add Transaction
      </button>
    </div>
  );
}
```

**10.1.4 Transaction Import from CSV (3 hours)**

```typescript
// New File: app/src/components/finance/ImportTransactions.tsx
import { useState } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import Papa from 'papaparse';

export default function ImportTransactions({ onImport }: { onImport: (transactions: any[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    category: '',
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[^7_0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
        
        // Auto-detect columns
        const headers = Object.keys(results.data[^7_0]);
        const autoMapping = {
          date: headers.find(h => /date|time/i.test(h)) || '',
          description: headers.find(h => /desc|name|merchant/i.test(h)) || '',
          amount: headers.find(h => /amount|total|price/i.test(h)) || '',
          category: headers.find(h => /category|type/i.test(h)) || '',
        };
        setMapping(autoMapping);
      },
    });
  };

  const handleImport = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const transactions = results.data.map((row: any) => ({
          date: row[mapping.date],
          description: row[mapping.description],
          amount: parseFloat(row[mapping.amount].replace(/[^0-9.-]/g, '')),
          category: row[mapping.category],
          type: parseFloat(row[mapping.amount]) < 0 ? 'expense' : 'income',
        }));

        await onImport(transactions);
      },
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Import from CSV</h3>

      <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center mb-6">
        <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="cursor-pointer px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl inline-block"
        >
          Choose CSV File
        </label>
        {file && <p className="mt-2 text-sm text-slate-400">{file.name}</p>}
      </div>

      {preview.length > 0 && (
        <>
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Map Columns</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(mapping).map(([field, value]) => (
                <div key={field}>
                  <label className="block text-sm text-slate-400 mb-2 capitalize">{field}</label>
                  <select
                    value={value}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select column...</option>
                    {Object.keys(preview[^7_0]).map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Preview ({preview.length} rows)</h4>
            <div className="bg-slate-800 rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="text-left p-3 text-slate-400">Date</th>
                    <th className="text-left p-3 text-slate-400">Description</th>
                    <th className="text-right p-3 text-slate-400">Amount</th>
                    <th className="text-left p-3 text-slate-400">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="p-3 text-white">{row[mapping.date]}</td>
                      <td className="p-3 text-white">{row[mapping.description]}</td>
                      <td className="p-3 text-right text-white">{row[mapping.amount]}</td>
                      <td className="p-3 text-white">{row[mapping.category]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            Import Transactions
          </button>
        </>
      )}
    </div>
  );
}
```


***

### 10.2 Project Budget Tracking (10 hours)

#### What You're Getting:

- Link expenses to projects
- Budget vs actual tracking
- Billable hours conversion
- Project profitability reports


#### Implementation Details:

**10.2.1 Project Budget Setup (3 hours)**

```sql
-- Add to projects table
ALTER TABLE projects ADD COLUMN budget DECIMAL(15, 2);
ALTER TABLE projects ADD COLUMN budget_currency TEXT DEFAULT 'USD';
ALTER TABLE projects ADD COLUMN hourly_rate DECIMAL(10, 2); -- For billable hours

-- Create view for project financials
CREATE OR REPLACE VIEW project_financials AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.budget,
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) AS total_income,
  p.budget - COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS remaining_budget,
  CASE 
    WHEN p.budget > 0 THEN 
      (COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) / p.budget * 100)
    ELSE 0 
  END AS budget_used_percentage,
  -- Billable hours
  COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600), 0) AS total_hours,
  COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600) * p.hourly_rate, 0) AS billable_amount,
  -- Profitability
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS profit
FROM projects p
LEFT JOIN finance_transactions ft ON ft.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY p.id, p.name, p.budget, p.hourly_rate;
```

**10.2.2 Project Budget Component (4 hours)**

```typescript
// New File: app/src/components/finance/ProjectBudgetCard.tsx
import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ProjectBudgetCardProps {
  projectId: string;
}

export default function ProjectBudgetCard({ projectId }: ProjectBudgetCardProps) {
  const [financials, setFinancials] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadFinancials();
  }, [projectId]);

  const loadFinancials = async () => {
    const { data } = await supabase
      .from('project_financials')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (data) setFinancials(data);
  };

  if (!financials) return null;

  const budgetPercentage = Math.min(financials.budget_used_percentage, 100);
  const isOverBudget = budgetPercentage > 100;
  const isNearLimit = budgetPercentage > 80;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Project Budget</h3>
        {isOverBudget && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm">
            <AlertTriangle className="w-4 h-4" />
            Over Budget
          </div>
        )}
      </div>

      {/* Budget Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Budget Used</span>
          <span className="text-sm font-medium text-white">
            ${financials.total_expenses.toLocaleString()} / ${financials.budget.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isOverBudget
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-400">Remaining</span>
          </div>
          <div className={`text-2xl font-bold ${
            financials.remaining_budget < 0 ? 'text-red-500' : 'text-white'
          }`}>
            ${Math.abs(financials.remaining_budget).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-400">Income</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ${financials.total_income.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-slate-400">Billable Hours</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {financials.total_hours.toFixed(1)}h
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ${financials.billable_amount.toLocaleString()} value
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {financials.profit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-slate-400">Profit</span>
          </div>
          <div className={`text-2xl font-bold ${
            financials.profit >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            ${Math.abs(financials.profit).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => window.location.href = `/dashboard/finance/transactions/new?project=${projectId}`}
          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
        >
          Add Expense
        </button>
        <button
          onClick={() => window.location.href = `/dashboard/finance/transactions/new?project=${projectId}&type=income`}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          Add Income
        </button>
      </div>
    </div>
  );
}
```


***

### 10.3 Financial Goals \& Forecasting (12 hours)

#### What You're Getting:

- Goal builder with target amounts and dates
- Reverse calculator (daily/weekly/monthly needed)
- Progress tracking with animations
- What-if scenario modeling
- Recurring income/expense forecasting


#### Implementation Details:

**10.3.1 Goal Builder Component (5 hours)**

```typescript
// New File: app/src/components/finance/GoalBuilder.tsx
'use client';

import { useState } from 'react';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { differenceInDays, differenceInWeeks, differenceInMonths, addDays, format } from 'date-fns';

export default function GoalBuilder({ onSave }: { onSave: (goal: any) => void }) {
  const [mode, setMode] = useState<'target' | 'daily'>('target');
  const [goalData, setGoalData] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    dailyIncome: 0, // For reverse calculation
  });

  const [forecast, setForecast] = useState<any>(null);

  const calculateForward = () => {
    // Calculate how much per day/week/month needed to hit target
    if (!goalData.targetDate || !goalData.targetAmount) return;

    const target = goalData.targetAmount - goalData.currentAmount;
    const daysRemaining = differenceInDays(new Date(goalData.targetDate), new Date());
    const weeksRemaining = differenceInWeeks(new Date(goalData.targetDate), new Date());
    const monthsRemaining = differenceInMonths(new Date(goalData.targetDate), new Date());

    setForecast({
      target,
      daysRemaining,
      perDay: target / Math.max(daysRemaining, 1),
      perWeek: target / Math.max(weeksRemaining, 1),
      perMonth: target / Math.max(monthsRemaining, 1),
    });
  };

  const calculateBackward = () => {
    // Calculate how long to hit target at current daily rate
    if (!goalData.dailyIncome || !goalData.targetAmount) return;

    const target = goalData.targetAmount - goalData.currentAmount;
    const daysNeeded = Math.ceil(target / goalData.dailyIncome);
    const estimatedDate = addDays(new Date(), daysNeeded);

    setForecast({
      target,
      daysNeeded,
      estimatedDate,
      perDay: goalData.dailyIncome,
      perWeek: goalData.dailyIncome * 7,
      perMonth: goalData.dailyIncome * 30,
    });
  };

  const handleCalculate = () => {
    if (mode === 'target') {
      calculateForward();
    } else {
      calculateBackward();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Financial Goal Calculator</h3>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('target')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            mode === 'target'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Target Amount & Date
        </button>
        <button
          onClick={() => setMode('daily')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            mode === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Daily Income Rate
        </button>
      </div>

      {/* Common Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Goal Name
          </label>
          <input
            type="text"
            value={goalData.name}
            onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
            placeholder="e.g., Save for vacation"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              value={goalData.targetAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, targetAmount: parseFloat(e.target.value) || 0 })}
              placeholder="100000"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Current Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              value={goalData.currentAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, currentAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>
      </div>

      {/* Mode-Specific Fields */}
      {mode === 'target' ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="date"
              value={goalData.targetDate}
              onChange={(e) => setGoalData({ ...goalData, targetDate: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Daily Income
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              value={goalData.dailyIncome || ''}
              onChange={(e) => setGoalData({ ...goalData, dailyIncome: parseFloat(e.target.value) || 0 })}
              placeholder="100"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleCalculate}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium mb-6"
      >
        Calculate
      </button>

      {/* Forecast Results */}
      {forecast && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h4 className="text-lg font-semibold text-white">Your Path to ${goalData.targetAmount.toLocaleString()}</h4>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Day</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perDay.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Week</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perWeek.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Month</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perMonth.toFixed(2)}
              </div>
            </div>
          </div>

          {mode === 'target' ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {forecast.daysRemaining} days
              </div>
              <div className="text-slate-400">
                until {format(new Date(goalData.targetDate), 'MMMM d, yyyy')}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {forecast.daysNeeded} days
              </div>
              <div className="text-slate-400">
                Goal reached by {format(forecast.estimatedDate, 'MMMM d, yyyy')}
              </div>
            </div>
          )}

          <button
            onClick={() => onSave({ ...goalData, ...forecast })}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            Save Goal
          </button>
        </div>
      )}
    </div>
  );
}
```

**10.3.2 Goal Progress Dashboard (4 hours)**

```typescript
// New File: app/src/components/finance/GoalProgressDashboard.tsx
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function GoalProgressDashboard() {
  const [goals, setGoals] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const { data } = await supabase
      .from('finance_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
  };

  const updateGoalProgress = async (goalId: string, newAmount: number) => {
    await supabase
      .from('finance_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId);

    loadGoals();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {goals.map(goal => {
        const progress = (goal.current_amount / goal.target_amount) * 100;
        const remaining = goal.target_amount - goal.current_amount;
        const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

        return (
          <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">{goal.name}</h3>
                {goal.description && (
                  <p className="text-sm text-slate-400">{goal.description}</p>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                progress >= 100
                  ? 'bg-green-500/10 text-green-500'
                  : progress >= 75
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {progress.toFixed(0)}%
              </div>
            </div>

            {/* Progress Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-800"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - Math.min(progress / 100, 1))}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-white">
                    ${(goal.current_amount / 1000).toFixed(1)}k
                  </div>
                  <div className="text-sm text-slate-400">
                    of ${(goal.target_amount / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-400">Remaining</span>
                </div>
                <div className="text-lg font-bold text-white">
                  ${remaining.toLocaleString()}
                </div>
              </div>

              {daysLeft !== null && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-slate-400">Days Left</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    daysLeft < 0 ? 'text-red-500' : 'text-white'
                  }`}>
                    {Math.abs(daysLeft)}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Add amount"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text


<div align="center">⁂</div>

[^7_1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/70732981/2e19a42f-5ceb-4e01-956f-f6bb2239c669/COMPLETE_IMPLEMENTATION_PLAN.md

---

# continue

```markdown
-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    const amount = parseFloat(input.value);
                    if (amount > 0) {
                      updateGoalProgress(goal.id, goal.current_amount + amount);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const amount = parseFloat(prompt('Add to goal:') || '0');
                  if (amount > 0) {
                    updateGoalProgress(goal.id, goal.current_amount + amount);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**10.3.3 Financial Forecasting (3 hours)**

```typescript
// New File: app/src/lib/financial-forecast.ts
import { addMonths, eachMonthOfInterval, format } from 'date-fns';

interface RecurringTransaction {
  amount: number;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category: string;
}

export interface ForecastResult {
  month: string;
  income: number;
  expenses: number;
  netIncome: number;
  balance: number;
}

export function generateForecast(
  currentBalance: number,
  recurringTransactions: RecurringTransaction[],
  monthsAhead: number = 12
): ForecastResult[] {
  const startDate = new Date();
  const endDate = addMonths(startDate, monthsAhead);
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  let runningBalance = currentBalance;
  const forecast: ForecastResult[] = [];

  for (const month of months) {
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    // Calculate for each recurring transaction
    recurringTransactions.forEach(transaction => {
      let monthlyAmount = 0;

      switch (transaction.frequency) {
        case 'daily':
          monthlyAmount = transaction.amount * 30;
          break;
        case 'weekly':
          monthlyAmount = transaction.amount * 4;
          break;
        case 'monthly':
          monthlyAmount = transaction.amount;
          break;
        case 'yearly':
          monthlyAmount = transaction.amount / 12;
          break;
      }

      if (transaction.type === 'income') {
        monthlyIncome += monthlyAmount;
      } else {
        monthlyExpenses += monthlyAmount;
      }
    });

    const netIncome = monthlyIncome - monthlyExpenses;
    runningBalance += netIncome;

    forecast.push({
      month: format(month, 'MMM yyyy'),
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netIncome,
      balance: runningBalance,
    });
  }

  return forecast;
}

// What-if scenarios
export function compareScenarios(
  currentBalance: number,
  baseRecurring: RecurringTransaction[],
  scenarios: { name: string; transactions: RecurringTransaction[] }[],
  monthsAhead: number = 12
) {
  return scenarios.map(scenario => ({
    name: scenario.name,
    forecast: generateForecast(currentBalance, scenario.transactions, monthsAhead),
  }));
}
```

```typescript
// New File: app/src/components/finance/ForecastChart.tsx
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { generateForecast } from '@/lib/financial-forecast';

interface ForecastChartProps {
  currentBalance: number;
  recurringTransactions: any[];
  monthsAhead?: number;
}

export default function ForecastChart({ currentBalance, recurringTransactions, monthsAhead = 12 }: ForecastChartProps) {
  const forecast = useMemo(
    () => generateForecast(currentBalance, recurringTransactions, monthsAhead),
    [currentBalance, recurringTransactions, monthsAhead]
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      ```
      <h3 className="text-xl font-semibold text-white mb-6">12-Month Forecast</h3>
      ```

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={forecast}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#3b82f6"
            fill="url(#colorBalance)"
            strokeWidth={2}
          />
          <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
          <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-slate-800 rounded-xl p-4">
          ```
          <div className="text-sm text-slate-400 mb-1">Final Balance</div>
          ```
          <div className="text-2xl font-bold text-white">
            ${forecast[forecast.length - 1]?.balance.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            in {monthsAhead} months
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          ```
          <div className="text-sm text-slate-400 mb-1">Total Income</div>
          ```
          <div className="text-2xl font-bold text-green-500">
            ${forecast.reduce((sum, m) => sum + m.income, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          ```
          <div className="text-sm text-slate-400 mb-1">Total Expenses</div>
          ```
          <div className="text-2xl font-bold text-red-500">
            ${forecast.reduce((sum, m) => sum + m.expenses, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
```


***

## PHASE 11: File Attachments \& Storage

**Priority:** MEDIUM
**Timeline:** Week 5 (25-30 hours)
**Goal:** Complete file management system with storage, previews, and sharing

### 11.1 Supabase Storage Setup (8 hours)

#### What You're Getting:

- Secure file upload with virus scanning
- Multi-file drag-and-drop
- Image preview and thumbnails
- File versioning
- Access control (public/private/workspace)


#### Implementation Details:

**11.1.1 Storage Configuration (2 hours)**

```sql
-- Run in Supabase SQL Editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('workspace-files', 'workspace-files', false, 52428800, ARRAY[
    'image/*', 
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/*',
    'video/mp4',
    'video/webm'
  ]),
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/*']),
  ('project-attachments', 'project-attachments', false, 104857600, NULL);

-- Storage policies for workspace files
CREATE POLICY "Workspace members can upload files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workspace-files' AND
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = (storage.foldername(name))[^8_1]::uuid
    )
  );

CREATE POLICY "Workspace members can view files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workspace-files' AND
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = (storage.foldername(name))[^8_1]::uuid
    )
  );

CREATE POLICY "File owners can delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workspace-files' AND
    owner = auth.uid()
  );

-- User avatars policies (public read, owner write)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[^8_1]
  );

-- File metadata table
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in storage bucket
  original_name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  
  -- Linkable to different entities
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  comment_id UUID, -- For future comments feature
  
  -- File metadata
  thumbnail_path TEXT, -- Generated thumbnail for images/videos
  width INTEGER, -- For images
  height INTEGER,
  duration FLOAT, -- For videos/audio
  
  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES file_attachments(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_attachments_workspace ON file_attachments(workspace_id);
CREATE INDEX idx_file_attachments_task ON file_attachments(task_id);
CREATE INDEX idx_file_attachments_project ON file_attachments(project_id);
CREATE INDEX idx_file_attachments_note ON file_attachments(note_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);

-- RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage attachments" ON file_attachments
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
```

**11.1.2 File Upload Component (4 hours)**

```typescript
// New File: app/src/components/files/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Upload, File, X, Image, FileText, Film, CheckCircle, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FileUploaderProps {
  workspaceId: string;
  entityType?: 'task' | 'project' | 'note';
  entityId?: string;
  onUploadComplete?: (files: any[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export default function FileUploader({
  workspaceId,
  entityType,
  entityId,
  onUploadComplete,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const supabase = createClientComponentClient();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Initialize uploading state
    const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadingFile of newFiles) {
      try {
        await uploadFile(uploadingFile);
      } catch (error) {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: 'error', error: (error as Error).message }
              : f
          )
        );
      }
    }
  }, [workspaceId, entityType, entityId]);

  const uploadFile = async (uploadingFile: UploadingFile) => {
    const { file } = uploadingFile;
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${workspaceId}/${fileName}`;

    // Upload to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('workspace-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress: percent } : f
            )
          );
        },
      });

    if (storageError) throw storageError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('workspace-files')
      .getPublicUrl(filePath);

    // Create metadata record
    const metadata: any = {
      workspace_id: workspaceId,
      storage_path: filePath,
      original_name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
    };

    // Link to entity if provided
    if (entityType && entityId) {
      metadata[`${entityType}_id`] = entityId;
    }

    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      const dimensions = await getImageDimensions(file);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
      
      // TODO: Generate and upload thumbnail
    }

    const { data: attachmentData, error: dbError } = await supabase
      .from('file_attachments')
      .insert(metadata)
      .select()
      .single();

    if (dbError) throw dbError;

    // Update state
    setUploadingFiles(prev =>
      prev.map(f =>
        f.id === uploadingFile.id
          ? { ...f, status: 'success', progress: 100, url: urlData.publicUrl }
          : f
      )
    );

    // Call callback
    if (onUploadComplete) {
      onUploadComplete([attachmentData]);
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/*': ['.txt', '.md', '.csv'],
      'video/*': ['.mp4', '.webm'],
    },
  });

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        {isDragActive ? (
          ```
          <p className="text-white font-medium">Drop files here...</p>
          ```
        ) : (
          <>
            <p className="text-white font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-slate-400">
              Max {maxFiles} files, up to {(maxSize / 1024 / 1024).toFixed(0)}MB each
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          {uploadingFiles.map(uploadingFile => (
            <div
              key={uploadingFile.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="text-slate-400">
                  {getFileIcon(uploadingFile.file.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">
                      {uploadingFile.file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {uploadingFile.status === 'uploading' && (
                        <span className="text-xs text-slate-400">
                          {uploadingFile.progress.toFixed(0)}%
                        </span>
                      )}
                      {uploadingFile.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {uploadingFile.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <button
                        onClick={() => removeFile(uploadingFile.id)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {uploadingFile.status === 'uploading' && (
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadingFile.status === 'error' && (
                    ```
                    <p className="text-xs text-red-500 mt-1">{uploadingFile.error}</p>
                    ```
                  )}

                  {/* File Size */}
                  <p className="text-xs text-slate-500 mt-1">
                    {(uploadingFile.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**11.1.3 File Gallery Component (2 hours)**

```typescript
// New File: app/src/components/files/FileGallery.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Download, Eye, Trash2, Image as ImageIcon, FileText, Film } from 'lucide-react';
import { format } from 'date-fns';

interface FileGalleryProps {
  workspaceId: string;
  entityType?: 'task' | 'project' | 'note';
  entityId?: string;
  onDelete?: (fileId: string) => void;
}

export default function FileGallery({ workspaceId, entityType, entityId, onDelete }: FileGalleryProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadFiles();
  }, [workspaceId, entityType, entityId]);

  const loadFiles = async () => {
    let query = supabase
      .from('file_attachments')
      .select('*, uploader:profiles(full_name, avatar_url)')
      .eq('workspace_id', workspaceId);

    if (entityType && entityId) {
      query = query.eq(`${entityType}_id`, entityId);
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setFiles(data);
  };

  const downloadFile = async (file: any) => {
    const { data } = await supabase.storage
      .from('workspace-files')
      .download(file.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
    }
  };

  const deleteFile = async (file: any) => {
    if (!confirm('Delete this file?')) return;

    // Delete from storage
    await supabase.storage.from('workspace-files').remove([file.storage_path]);

    // Delete metadata
    await supabase.from('file_attachments').delete().eq('id', file.id);

    setFiles(prev => prev.filter(f => f.id !== file.id));
    if (onDelete) onDelete(file.id);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
    if (mimeType.startsWith('video/')) return <Film className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const getFileUrl = (file: any) => {
    const { data } = supabase.storage
      .from('workspace-files')
      .getPublicUrl(file.storage_path);
    return data.publicUrl;
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No files attached
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map(file => (
          <div
            key={file.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors group"
          >
            {/* Preview */}
            <div className="aspect-square bg-slate-800 flex items-center justify-center relative">
              {file.mime_type.startsWith('image/') ? (
                <img
                  src={getFileUrl(file)}
                  alt={file.original_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-600">
                  {getFileIcon(file.mime_type)}
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setSelectedFile(file)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
                  title="Preview"
                >
                  <Eye className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => downloadFile(file)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => deleteFile(file)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg backdrop-blur-sm"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="p-3">
              <p className="text-sm font-medium text-white truncate" title={file.original_name}>
                {file.original_name}
              </p>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>{(file.size_bytes / 1024).toFixed(0)} KB</span>
                ```
                <span>{format(new Date(file.created_at), 'MMM d')}</span>
                ```
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              ```
              <h3 className="text-lg font-semibold text-white">{selectedFile.original_name}</h3>
              ```
              <div className="flex gap-2">
                <button
                  onClick={() => downloadFile(selectedFile)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Download
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-auto">
              {selectedFile.mime_type.startsWith('image/') && (
                <img
                  src={getFileUrl(selectedFile)}
                  alt={selectedFile.original_name}
                  className="w-full rounded-xl"
                />
              )}
              {selectedFile.mime_type.startsWith('video/') && (
                <video
                  src={getFileUrl(selectedFile)}
                  controls
                  className="w-full rounded-xl"
                />
              )}
              {selectedFile.mime_type === 'application/pdf' && (
                <iframe
                  src={getFileUrl(selectedFile)}
                  className="w-full h-[600px] rounded-xl"
                  title={selectedFile.original_name}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```


***

### 11.2 File Organization \& Search (10 hours)

#### What You're Getting:

- Folder structure for workspace
- Advanced file search (name, type, date, size)
- Batch operations (move, delete, download)
- Recent files view
- File activity timeline


#### Implementation Details:

**11.2.1 Folder System (3 hours)**

```sql
-- Add folders table
CREATE TABLE file_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, parent_id, name)
);

CREATE INDEX idx_file_folders_workspace ON file_folders(workspace_id);
CREATE INDEX idx_file_folders_parent ON file_folders(parent_id);

-- Add folder_id to file_attachments
ALTER TABLE file_attachments ADD COLUMN folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_file_attachments_folder ON file_attachments(folder_id);

-- RLS
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage folders" ON file_folders
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
```

```typescript
// New File: app/src/components/files/FolderTree.tsx
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Folder, FolderPlus, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';

interface FolderTreeProps {
  workspaceId: string;
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId?: string | null;
}

export default function FolderTree({ workspaceId, onFolderSelect, selectedFolderId }: FolderTreeProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadFolders();
  }, [workspaceId]);

  const loadFolders = async () => {
    const { data } = await supabase
      .from('file_folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (data) setFolders(data);
  };

  const createFolder = async (parentId: string | null) => {
    const name = prompt('Folder name:');
    if (!name) return;

    const { error } = await supabase.from('file_folders').insert({
      workspace_id: workspaceId,
      name,
      parent_id: parentId,
    });

    if (!error) loadFolders();
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const buildTree = (parentId: string | null = null, level: number = 0): React.ReactNode => {
    const children = folders.filter(f => f.parent_id === parentId);
    
    return children.map(folder => {
      const hasChildren = folders.some(f => f.parent_id === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
          >
            {hasChildren && (
              <button
                onClick={() => toggleFolder(folder.id)}
                className="p-0.5 hover:bg-white/10 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            
            <Folder className="w-4 h-4 flex-shrink-0" />
            
            <span
              className="flex-1 text-sm font-medium truncate"
              onClick={() => onFolderSelect(folder.id)}
            >
              {folder.name}
            </span>

            <button className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {hasChildren && isExpanded && buildTree(folder.id, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        ```
        <h3 className="text-lg font-semibold text-white">Folders</h3>
        ```
        <button
          onClick={() => createFolder(null)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="New folder"
        >
          <FolderPlus className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Root Level */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mb-2 transition-colors ${
          selectedFolderId === null
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
        onClick={() => onFolderSelect(null)}
      >
        <Folder className="w-4 h-4" />
        ```
        <span className="text-sm font-medium">All Files</span>
        ```
      </div>

      {/* Folder Tree */}
      <div className="space-y-1">
        {buildTree()}
      </div>
    </div>
  );
}
```

**11.2.2 Advanced File Search (4 hours)**

```typescript
// New File: app/src/components/files/FileSearch.tsx
import { useState } from 'react';
import { Search, Filter, X, Calendar, FileType, HardDrive } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface FileSearchProps {
  workspaceId: string;
  onResults: (files: any[]) => void;
}

export default function FileSearch({ workspaceId, onResults }: FileSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    minSize: '',
    maxSize: '',
    dateFrom: '',
    dateTo: '',
    uploadedBy: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const supabase = createClientComponentClient();

  const search = async () => {
    let queryBuilder = supabase
      .from('file_attachments')
      .select('*, uploader:profiles(full_name)')
      .eq('workspace_id', workspaceId);

    // Text search
    if (query) {
      queryBuilder = queryBuilder.ilike('original_name', `%${query}%`);
    }

    // Type filter
    if (filters.type) {
      queryBuilder = queryBuilder.like('mime_type', `${filters.type}/%`);
    }

    // Size filters
    if (filters.minSize) {
      queryBuilder = queryBuilder.gte('size_bytes', parseInt(filters.minSize) * 1024);
    }
    if (filters.maxSize) {
      queryBuilder = queryBuilder.lte('size_bytes', parseInt(filters.maxSize) * 1024);
    }

    // Date filters
    if (filters.dateFrom) {
      queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
    }

    // Uploader filter
    if (filters.uploadedBy) {
      queryBuilder = queryBuilder.eq('uploaded_by', filters.uploadedBy);
    }

    const { data } = await queryBuilder.order('created_at', { ascending: false });
    if (data) onResults(data);
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      minSize: '',
      maxSize: '',
      dateFrom: '',
      dateTo: '',
      uploadedBy: '',
    });
    setQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && search()}
            placeholder="Search files..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl transition-colors ${
            showFilters
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>

        <button
          onClick={search}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
        >
          Search
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            ```
            <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
            ```
            <button
              onClick={clearFilters}
              className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* File Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <FileType className="w-4 h-4" />
                File Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="application">Documents</option>
                <option value="text">Text Files</option>
              </select>
            </div>

            {/* Size Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <HardDrive className="w-4 h-4" />
                Size (KB)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minSize}
                  onChange={(e) => setFilters({ ...filters, minSize: e.target.value })}
                  placeholder="Min"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="number"
                  value={filters.maxSize}
                  onChange={(e) => setFilters({ ...filters, maxSize: e.target.value })}
                  placeholder="Max"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4" />
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4" />
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**11.2.3 Batch File Operations (3 hours)**

```typescript
// New File: app/src/components/files/BatchActions.tsx
import { useState } from 'react';
import { Download, Trash2, FolderInput, CheckSquare, Square } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface BatchActionsProps {
  files: any[];
  selectedFiles: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onComplete: () => void;
}

export default function BatchActions({
  files,
  selectedFiles,
  onSelectionChange,
  onComplete,
}: BatchActionsProps) {
  const [processing, setProcessing] = useState(false);
  const supabase = createClientComponentClient();

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(files.map(f => f.id)));
    }
  };

  const downloadSelected = async () => {
    setProcessing(true);
    const zip = new JSZip();

    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId);
      if (!file) continue;

      const { data } = await supabase.storage
        .from('workspace-files')
        .download(file.storage_path);

      if (data) {
        zip.file(file.original_name, data);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `files-${Date.now()}.zip`);
    setProcessing(false);
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedFiles.size} files?`)) return;

    setProcessing(true);
    const filesToDelete = files.filter(f => selectedFiles.has(f.id));

    // Delete from storage
    const storagePaths = filesToDelete.map(f => f.storage_path);
    await supabase.storage.from('workspace-files').remove(storagePaths);

    // Delete metadata
    await supabase
      .from('file_attachments')
      .delete()
      .in('id', Array.from(selectedFiles));

    setProcessing(false);
    onSelectionChange(new Set());
    onComplete();
  };

  const moveToFolder = async () => {
    // TODO: Show folder picker modal
    const folderId = prompt('Enter folder ID:');
    if (!folderId) return;

    setProcessing(true);
    await supabase
      .from('file_attachments')
      .update({ folder_id: folderId })
      .in('id', Array.from(selectedFiles));

    setProcessing(false);
    onSelectionChange(new Set());
    onComplete();
  };

  if (selectedFiles.size === 0) return null;

  return (
    <div className="bg-blue-600 border border-blue-500 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-white hover:text-blue-100"
        >
          {selectedFiles.size === files.length ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5" />
          )}
          ```
          <span className="font-medium">{selectedFiles.size} selected</span>
          ```
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={downloadSelected}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download
        </button>

        <button
          onClick={moveToFolder}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg disabled:opacity-50"
        >
          <FolderInput className="w-4 h-4" />
          Move
        </button>

        <button
          onClick={deleteSelected}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
```


***

## PHASE 12: Notion-Inspired Features

**Priority:** MEDIUM
**Timeline:** Week 6 (30-35 hours)
**Goal:** Add Notion-level workspace features

### 12.1 Database Views (12 hours)

#### What You're Getting:

- Create custom databases (like Notion databases)
- Multiple views: Table, Board, Calendar, Gallery
- Custom properties with formulas
- Filtering, sorting, grouping
- Relations between databases


#### Implementation Details:

**12.1.1 Database Schema (3 hours)**

```sql
-- Custom databases
CREATE TABLE custom_databases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  cover_image TEXT,
  properties JSONB DEFAULT '[]'::jsonb, -- Array of property definitions
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database views (table, board, calendar, gallery)
CREATE TABLE database_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES custom_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('table', 'board', 'calendar', 'gallery', 'list', 'timeline')),
  config JSONB DEFAULT '{}'::jsonb, -- View-specific config (group by, sort, filter)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database records (rows)
CREATE TABLE database_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES custom_databases(id) ON DELETE CASCADE,
  properties JSONB DEFAULT '{}'::jsonb, -- Key-value pairs of property values
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_databases_workspace ON custom_databases(workspace_id);
CREATE INDEX idx_database_views_database ON database_views(database_id);
CREATE INDEX idx_database_records_database ON database_records(database_id);
CREATE INDEX idx_database_records_properties ON database_records USING GIN (properties);

-- RLS
ALTER TABLE custom_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage databases" ON custom_databases
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Database members can view views" ON database_views
  USING (database_id IN (SELECT id FROM custom_databases WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Database members can manage records" ON database_records
  USING (database_id IN (SELECT id FROM custom_databases WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));
```

**Property Types Supported:**

- Text
- Number
- Select (single/multi)
- Date
- Checkbox
- URL
- Email
- Phone
- Person (user reference)
- Relation (link to another database)
- Formula (calculated field)
- Rollup (aggregate from relations)

**12.1.2 Database Builder Component (5 hours)**

```typescript
// New File: app/src/components/databases/DatabaseBuilder.tsx
'use client';

import { useState } from 'react';
import { Plus, X, GripVertical, Settings } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'person' | 'relation' | 'formula' | 'rollup';
  config?: any; // Type-specific configuration
}

export default function DatabaseBuilder({ onSave }: { onSave: (database: any) => void }) {
  const [name, setName] = useState('');
  const [properties, setProperties] = useState<Property[]>([
    { id: '1', name: 'Name', type: 'text' },
  ]);

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        id: Date.now().toString(),
        name: 'New Property',
        type: 'text',
      },
    ]);
  };

  const updateProperty = (id: string, updates: Partial<Property>) => {
    setProperties(properties.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  const handleSave = () => {
    onSave({
      name,
      properties,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      ```
      <h2 className="text-2xl font-bold text-white mb-6">Create Database</h2>
      ```

      {/* Database Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Database Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Product Roadmap, Customer CRM"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
        />
      </div>

      {/* Properties */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          ```
          <h3 className="text-lg font-semibold text-white">Properties</h3>
          ```
          <button
            onClick={addProperty}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        </div>

        <div className="space-y-3">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl"
            >
              <GripVertical className="w-5 h-5 text-slate-600 cursor-move" />

              <input
                type="text"
                value={property.name}
                onChange={(e) => updateProperty(property.id, { name: e.target.value })}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                placeholder="Property name"
              />

              <select
                value={property.type}
                onChange={(e) => updateProperty(property.id, { type: e.target.value as any })}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                ```
                <option value="multi_select">Multi-select</option>
                ```
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
                <option value="person">Person</option>
                <option value="relation">Relation</option>
                <option value="formula">Formula</option>
                <option value="rollup">Rollup</option>
              </select>

              {(property.type === 'select' || property.type === 'multi_select') && (
                <button
                  className="p-2 hover:bg-slate-700 rounded-lg"
                  title="Configure options"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {index > 0 && (
                <button
                  onClick={() => deleteProperty(property.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
        >
          Create Database
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**12.1.3 Table View Component (4 hours)**

```typescript
// New File: app/src/components/databases/TableView.tsx
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, Filter, SortAsc, Eye } from 'lucide-react';

interface TableViewProps {
  databaseId: string;
  viewId: string;
}

export default function TableView({ databaseId, viewId }: TableViewProps) {
  const [database, setDatabase] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ recordId: string; propertyId: string } | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadDatabase();
    loadRecords();
  }, [databaseId]);

  const loadDatabase = async () => {
    const { data } = await supabase
      .from('custom_databases')
      .select('*')
      .eq('id', databaseId)
      .single();

    if (data) setDatabase(data);
  };

  const loadRecords = async () => {
    const { data } = await supabase
      .from('database_records')
      .select('*')
      .eq('database_id', databaseId)
      .order('created_at', { ascending: false });

    if (data) setRecords(data);
  };

  const addRecord = async () => {
    const { data } = await supabase
      .from('database_records')
      .insert({
        database_id: databaseId,
        properties: {},
      })
      .select()
      .single();

    if (data) {
      setRecords([data, ...records]);
    }
  };

  const updateCell = async (recordId: string, propertyId: string, value: any) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const updatedProperties = {
      ...record.properties,
      [propertyId]: value,
    };

    await supabase
      .from('database_records')
      .update({ properties: updatedProperties })
      .eq('id', recordId);

    setRecords(records.map(r =>
      r.id === recordId
        ? { ...r, properties: updatedProperties }
        : r
    ));

    setEditingCell(null);
  };

  const renderCell = (record: any, property: any) => {
    const value = record.properties[property.id];
    const isEditing = editingCell?.recordId === record.id && editingCell?.propertyId === property.id;

    if (isEditing) {
      switch (property.type) {
        case 'text':
          return (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => updateCell(record.id, property.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
              className="w-full px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white"
            />
          );
        case 'number':
          return (
            <input
              type="number"
              value={value || ''}
              onChange={(e) => updateCell(record.id, property.id, parseFloat(e.target.value))}
              onBlur={() => setEditingCell(null)}
              autoFocus
              className="w-full px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white"
            />
          );
        case 'checkbox':
          return (
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateCell(record.id, property.id, e.target.checked)}
              className="w-5 h-5"
            />
          );
        case 'date':
          return (
            <input
              type="date"
              value={value || ''}
              onChange={(e) => updateCell(record.id, property.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
              className="w-full px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white"
            />
          );
        default:
          return (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => updateCell(record.id, property.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
              className="w-full px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white"
            />
          );
      }
    }

    return (
      <div
        onClick={() => setEditingCell({ recordId: record.id, propertyId: property.id })}
        className="px-2 py-1 cursor-pointer hover:bg-slate-800 rounded min-h-[32px]"
      >
        {property.type === 'checkbox' ? (
          <input type="checkbox" checked={value || false} readOnly className="w-5 h-5" />
        ) : (
          <span className="text-white">{value || ''}</span>
        )}
      </div>
    );
  };

```

if (!database) return <div>Loading...</div>;

```

return (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
      ```
      <h2 className="text-xl font-bold text-white">{database.name}</h2>
      ```
      
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
          <SortAsc className="w-4 h-4" />
          Sort
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
          <Eye className="w-4 h-4" />
          View
        </button>
      </div>
    </div>

    {/* Table */}
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="bg-slate-800/50 border-b border-slate-800">
          <tr>
            {database.properties.map((property: any) => (
              <th
                key={property.id}
                className="px-4 py-3 text-left text-sm font-medium text-slate-300 min-w-[200px]"
              >
                {property.name}
                ```
                <span className="ml-2 text-xs text-slate-500 capitalize">{property.type}</span>
                ```
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              {database.properties.map((property: any) => (
                <td key={property.id} className="px-4 py-2">
                  {renderCell(record, property)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Add Record Button */}
    <div className="p-4 border-t border-slate-800">
      <button
        onClick={addRecord}
        className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Record
      </button>
    </div>
  </div>
);
}

### 12.2 Templates System (10 hours)

#### What You're Getting:
- Pre-built page templates (Meeting Notes, Project Brief, etc.)
- Template marketplace
- Custom template creation
- Variables and dynamic content
- Template versioning

#### Implementation Details:

**12.2.1 Template Schema (2 hours)**
```sql
-- Templates table
CREATE TABLE page_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'meeting', 'project', 'personal', 'team'
  content JSONB NOT NULL, -- Rich text content with variables
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- Pre-built templates
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template variables (for dynamic content)
CREATE TABLE template_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES page_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'date', 'number', 'select', 'user')),
  default_value TEXT,
  options JSONB, -- For select type
  required BOOLEAN DEFAULT false
);

CREATE INDEX idx_page_templates_workspace ON page_templates(workspace_id);
CREATE INDEX idx_page_templates_category ON page_templates(category);
CREATE INDEX idx_template_variables_template ON template_variables(template_id);

-- RLS
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public and own templates" ON page_templates
  FOR SELECT
  USING (
    is_public = true OR 
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create templates in their workspace" ON page_templates
  FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- System templates (insert on setup)
INSERT INTO page_templates (name, description, category, content, is_system, is_public) VALUES
(
  'Meeting Notes',
  'Standard meeting notes template with agenda and action items',
  'meeting',
  '{
    "type": "doc",
    "content": [
      {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "{{meeting_title}}"}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Meeting Details"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "📅 Date: {{date}}"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "⏰ Time: {{time}}"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "👥 Attendees: {{attendees}}"}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Agenda"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Discussion"}]},
      {"type": "paragraph"},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Action Items"}]},
      {"type": "taskList", "content": [{"type": "taskItem", "attrs": {"checked": false}, "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Next Steps"}]},
      {"type": "paragraph"}
    ]
  }'::jsonb,
  true,
  true
),
(
  'Project Brief',
  'Comprehensive project brief template',
  'project',
  '{
    "type": "doc",
    "content": [
      {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "{{project_name}}"}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Overview"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Brief description of the project..."}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Objectives"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Scope"}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "In Scope"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Out of Scope"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Timeline"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Start Date: {{start_date}}"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "End Date: {{end_date}}"}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Team"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Budget"}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Total Budget: {{budget}}"}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Success Criteria"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]}
    ]
  }'::jsonb,
  true,
  true
),
(
  'Weekly Review',
  'Personal weekly review template',
  'personal',
  '{
    "type": "doc",
    "content": [
      {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Week of {{week_date}}"}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "✅ Wins This Week"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "📚 What I Learned"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "🚧 Challenges"}]},
      {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "🎯 Goals for Next Week"}]},
      {"type": "taskList", "content": [{"type": "taskItem", "attrs": {"checked": false}, "content": [{"type": "paragraph"}]}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "💭 Reflections"}]},
      {"type": "paragraph"}
    ]
  }'::jsonb,
  true,
  true
);
```

### 12.2.2 Template Selector Component (4 hours)**

```typescript
// New File: app/src/components/templates/TemplateGallery.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Star, Briefcase, Users, User, Calendar } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  usage_count: number;
  is_system: boolean;
}

interface TemplateGalleryProps {
  workspaceId: string;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export default function TemplateGallery({ workspaceId, onSelect, onClose }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('page_templates')
      .select('*')
      .or(`is_public.eq.true,workspace_id.eq.${workspaceId}`)
      .order('usage_count', { ascending: false });

    if (data) setTemplates(data);
  };

  const categories = [
    { id: 'all', name: 'All Templates', icon: Star },
    { id: 'meeting', name: 'Meeting', icon: Calendar },
    { id: 'project', name: 'Project', icon: Briefcase },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'personal', name: 'Personal', icon: User },
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-4">Choose a Template</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-64 border-r border-slate-800 p-4 overflow-auto">
            <div className="space-y-1">
              {categories.map(category => {
                const Icon = category.icon;
                const count = category.id === 'all' 
                  ? templates.length 
                  : templates.filter(t => t.category === category.id).length;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Grid */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition-all cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-6xl opacity-20">📄</div>
                    )}
                    
                    {/* System Badge */}
                    {template.is_system && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                        Official
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{template.category}</span>
                      <span>{template.usage_count} uses</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">No templates found</p>
                <p className="text-slate-600 text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
          >
            Cancel
          </button>
          
          <button
            onClick={() => window.location.href = `/dashboard/templates/create`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Create Custom Template
          </button>
        </div>
      </div>
    </div>
  );
}
```

**12.2.3 Template Instantiation (4 hours)**

```typescript
// New File: app/src/lib/template-engine.ts
import { format } from 'date-fns';

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'user';
  value: any;
}

export function instantiateTemplate(
  templateContent: any,
  variables: TemplateVariable[]
): any {
  // Create variable map
  const variableMap = new Map(variables.map(v => [v.name, v.value]));

  // Recursive function to replace variables in content
  const replaceVariables = (content: any): any => {
    if (typeof content === 'string') {
      // Replace {{variable_name}} with actual values
      return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        const value = variableMap.get(varName);
        if (value === undefined) return match;
        
        // Format based on type
        if (value instanceof Date) {
          return format(value, 'MMMM d, yyyy');
        }
        return String(value);
      });
    }

    if (Array.isArray(content)) {
      return content.map(replaceVariables);
    }

    if (typeof content === 'object' && content !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(content)) {
        result[key] = replaceVariables(value);
      }
      return result;
    }

    return content;
  };

  return replaceVariables(templateContent);
}

export async function createNoteFromTemplate(
  templateId: string,
  workspaceId: string,
  variables: TemplateVariable[],
  supabase: any
): Promise<any> {
  // Load template
  const { data: template } = await supabase
    .from('page_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) throw new Error('Template not found');

  // Instantiate content
  const content = instantiateTemplate(template.content, variables);

  // Extract title from variables or content
  const title = variables.find(v => v.name === 'meeting_title' || v.name === 'project_name')?.value 
    || `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;

  // Create note
  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      workspace_id: workspaceId,
      title,
      content: JSON.stringify(content),
    })
    .select()
    .single();

  if (error) throw error;

  // Increment usage count
  await supabase
    .from('page_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', templateId);

  return note;
}
```

```typescript
// New File: app/src/components/templates/TemplateVariableForm.tsx
import { useState } from 'react';
import { Calendar, User, Hash, Type } from 'lucide-react';

interface Variable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'user';
  default_value?: string;
  options?: string[];
  required: boolean;
}

interface TemplateVariableFormProps {
  variables: Variable[];
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
}

export default function TemplateVariableForm({ variables, onSubmit, onCancel }: TemplateVariableFormProps) {
  const [values, setValues] = useState<Record<string, any>>(
    variables.reduce((acc, v) => ({ ...acc, [v.name]: v.default_value || '' }), {})
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'date': return <Calendar className="w-5 h-5" />;
      case 'number': return <Hash className="w-5 h-5" />;
      case 'user': return <User className="w-5 h-5" />;
      default: return <Type className="w-5 h-5" />;
    }
  };

  const renderInput = (variable: Variable) => {
    switch (variable.type) {
      case 'text':
        return (
          <input
            type="text"
            value={values[variable.name] || ''}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            required={variable.required}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            placeholder={`Enter ${variable.name.replace(/_/g, ' ')}`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={values[variable.name] || ''}
            onChange={(e) => setValues({ ...values, [variable.name]: parseFloat(e.target.value) })}
            required={variable.required}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={values[variable.name] || ''}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            required={variable.required}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          />
        );
      
      case 'select':
        return (
          <select
            value={values[variable.name] || ''}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            required={variable.required}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          >
            <option value="">Select...</option>
            {variable.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Fill Template Variables</h3>

      <div className="space-y-4 mb-6">
        {variables.map(variable => (
          <div key={variable.name}>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <span className="text-slate-500">{getIcon(variable.type)}</span>
              {variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {variable.required && <span className="text-red-500">*</span>}
            </label>
            {renderInput(variable)}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
        >
          Create from Template
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```


---

### 12.3 Page Linking \& Mentions (8 hours)

#### What You're Getting:

- @ mentions for users
- [[Page links]] for internal pages
- Backlinks panel (what links here)
- Graph view of connections
- Quick page creator from links


#### Implementation Details:

**12.3.1 Mentions \& Links Schema (2 hours)**

```sql
-- Page mentions (@ and [[]])
CREATE TABLE page_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mention_type TEXT NOT NULL CHECK (mention_type IN ('page', 'user')),
  mention_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (
    (mention_type = 'page' AND target_note_id IS NOT NULL AND target_user_id IS NULL) OR
    (mention_type = 'user' AND target_user_id IS NOT NULL AND target_note_id IS NULL)
  )
);

CREATE INDEX idx_page_mentions_source ON page_mentions(source_note_id);
CREATE INDEX idx_page_mentions_target_note ON page_mentions(target_note_id);
CREATE INDEX idx_page_mentions_target_user ON page_mentions(target_user_id);

-- RLS
ALTER TABLE page_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in their workspace" ON page_mentions
  FOR SELECT
  USING (
    source_note_id IN (
      SELECT id FROM notes WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create mentions" ON page_mentions
  FOR INSERT
  WITH CHECK (
    source_note_id IN (
      SELECT id FROM notes WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );
```

**12.3.2 Mentions Extension for Tiptap (3 hours)**

```typescript
// New File: app/src/components/notes/extensions/mentions.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { MentionList } from './MentionList';

export interface MentionOptions {
  HTMLAttributes: Record<string, any>;
  renderLabel: (props: { node: any; options: MentionOptions }) => string;
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const Mention = Node.create<MentionOptions>({
  name: 'mention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ node }) {
        return `${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('mention'),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
        },
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-id': attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
      type: {
        default: 'user',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          return { 'data-type': attributes.type };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="mention"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'mention' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText('', pos, pos + node.nodeSize);
              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Page Link Extension
export const PageLink = Node.create({
  name: 'pageLink',

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: '[[',
        pluginKey: new PluginKey('pageLink'),
      },
    };
  },

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="page-link"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        {
          'data-type': 'page-link',
          class: 'text-blue-500 hover:underline cursor-pointer',
          href: `/dashboard/notes/${node.attrs.id}`,
        },
        HTMLAttributes
      ),
      `[[${node.attrs.label}]]`,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        pluginKey: new PluginKey('pageLink'),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
        },
        render: () => {
          let component: ReactRenderer;
          let popup: any;

          return {
            onStart: props => {
              component = new ReactRenderer(MentionList, {
                props: { ...props, type: 'page' },
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props) {
              component.updateProps({ ...props, type: 'page' });

              popup.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup.hide();
                return true;
              }

              return component.ref?.onKeyDown(props);
            },

            onExit() {
              popup.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
```

```typescript
// New File: app/src/components/notes/extensions/MentionList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MentionListProps {
  items: any[];
  command: (item: any) => void;
  type: 'user' | 'page';
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSuggestions();
  }, [props.type]);

  const loadSuggestions = async () => {
    if (props.type === 'user') {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(10);
      
      if (data) setItems(data);
    } else {
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .limit(10);
      
      if (data) setItems(data);
    }
  };

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      props.command({
        id: item.id,
        label: props.type === 'user' ? item.full_name : item.title,
        type: props.type,
      });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden max-w-xs">
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full px-4 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {props.type === 'user' ? (
            <div className="flex items-center gap-2">
              {item.avatar_url && (
                <img
                  src={item.avatar_url}
                  alt={item.full_name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span>{item.full_name}</span>
            </div>
          ) : (
            <span>{item.title}</span>
          )}
        </button>
      ))}

      {items.length === 0 && (
        <div className="px-4 py-2 text-slate-500 text-sm">
          No {props.type}s found
        </div>
      )}
    </div>
  );
});
```

**12.3.3 Backlinks Panel (3 hours)**

```typescript
// New File: app/src/components/notes/BacklinksPanel.tsx
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Link2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface BacklinksPanelProps {
  noteId: string;
}

export default function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadBacklinks();
  }, [noteId]);

  const loadBacklinks = async () => {
    const { data } = await supabase
      .from('page_mentions')
      .select(`
        id,
        mention_text,
        created_at,
        source_note:notes!source_note_id(
          id,
          title,
          content,
          updated_at
        )
      `)
      .eq('target_note_id', noteId)
      .eq('mention_type', 'page');

    if (data) setBacklinks(data);
  };

  if (backlinks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Backlinks</h3>
        </div>
        <p className="text-slate-500 text-sm">No pages link to this note yet</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">
          Backlinks <span className="text-slate-500">({backlinks.length})</span>
        </h3>
      </div>

      <div className="space-y-3">
        {backlinks.map(backlink => (
          <div
            key={backlink.id}
            className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <a
                href={`/dashboard/notes/${backlink.source_note.id}`}
                className="text-white font-medium hover:text-blue-400 transition-colors flex items-center gap-2"
              >
                {backlink.source_note.title}
                <ExternalLink className="w-4 h-4" />
              </a>
              <span className="text-xs text-slate-500">
                {format(new Date(backlink.source_note.updated_at), 'MMM d')}
              </span>
            </div>

            {/* Context excerpt */}
            <div className="text-sm text-slate-400">
              ...{backlink.mention_text}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```


---

## PHASE 13: Linear/ClickUp Features

**Priority:** MEDIUM
**Timeline:** Week 7 (30-35 hours)
**Goal:** Add advanced project management features

### 13.1 Issue Tracking System (15 hours)

#### What You're Getting:

- Issues separate from tasks (for bug tracking)
- Priority matrix view
- Sprint planning board
- Roadmap timeline
- Issue labels and components


#### Implementation Details:

**13.1.1 Issues Schema (3 hours)**

```sql
-- Issues table (separate from tasks)
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issue_number SERIAL, -- Auto-incrementing issue number
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type TEXT DEFAULT 'bug' CHECK (type IN ('bug', 'feature', 'improvement', 'task')),
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  reporter UUID REFERENCES profiles(id),
  
  -- Estimation
  story_points INTEGER,
  estimated_hours DECIMAL(10, 2),
  
  -- Sprint
  sprint_id UUID,
  
  -- Dates
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Parent/child relationships
  parent_issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  
  -- Metadata
  labels TEXT[],
  component TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints table
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  velocity INTEGER, -- Completed story points
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue comments
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue history (for tracking changes)
CREATE TABLE issue_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_workspace ON issues(workspace_id);
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_sprint ON issues(sprint_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_sprints_workspace ON sprints(workspace_id);
CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX idx_issue_history_issue ON issue_history(issue_id);

-- RLS
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage issues" ON issues
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage sprints" ON sprints
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can view/add comments" ON issue_comments
  USING (issue_id IN (SELECT id FROM issues WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can view issue history" ON issue_history
  FOR SELECT
  USING (issue_id IN (SELECT id FROM issues WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- Trigger to update issue history
CREATE OR REPLACE FUNCTION track_issue_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO issue_history (issue_id, user_id, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
    END IF;
    
    -- Track assignee changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO issue_history (issue_id, user_id, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
    
    -- Track priority changes
    IF OLD.priority != NEW.priority THEN
      INSERT INTO issue_history (issue_id, user_id, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'priority', OLD.priority, NEW.priority);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_changes_trigger
AFTER UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION track_issue_changes();
```

**13.1.2 Sprint Planning Board (6 hours)**

```typescript
// New File: app/src/app/dashboard/sprints/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar, Target, TrendingUp, PlayCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function SprintPage({ params }: { params: { id: string } }) {
  const [sprint, setSprint] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [backlogIssues, setBacklogIssues] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSprint();
    loadIssues();
  }, [params.id]);

  const loadSprint = async () => {
    const { data } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) setSprint(data);
  };

  const loadIssues = async () => {
    // Sprint issues
    const { data: sprintData } = await supabase
      .from('issues')
      .select('*, assigned_user:profiles!assigned_to(full_name, avatar_url)')
      .eq('sprint_id', params.id)
      .order('created_at');

    if (sprintData) setIssues(sprintData);

    // Backlog issues
    const { data: backlogData } = await supabase
      .from('issues')
      .select('*, assigned_user:profiles!assigned_to(full_name, avatar_url)')
      .is('sprint_id', null)
      .eq('status', 'backlog')
      .order('priority')
      .limit(20);

    if (backlogData) setBacklogIssues(backlogData);
  };

  const addToSprint = async (issueId: string) => {
    await supabase
      .from('issues')
      .update({ sprint_id: params.id, status: 'todo' })
      .eq('id', issueId);

    loadIssues();
  };

  const removeFromSprint = async (issueId: string) => {
    await supabase
      .from('issues')
      .update({ sprint_id: null, status: 'backlog' })
      .eq('id', issueId);

    loadIssues();
  };

  const startSprint = async () => {
    await supabase
      .from('sprints')
      .update({ status: 'active' })
      .eq('id', params.id);

    loadSprint();
  };

  if (!sprint) return <div>Loading...</div>;

  const totalPoints = issues.reduce((sum, i) => sum + (i.story_points || 0), 0);
  const completedPoints = issues
    .filter(i => i.status === 'done')
    .reduce((sum, i) => sum + (i.story_points || 0), 0);
  const daysRemaining = differenceInDays(new Date(sprint.end_date), new Date());

  return (
    <div className="p-8">
      {/* Sprint Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{sprint.name}</h1>
            {sprint.goal && (
              <div className="flex items-center gap-2 text-slate-400">
                <Target className="w-4 h-4" />
                <span>{sprint.goal}</span>
              </div>
            )}
          </div>

          {sprint.status === 'planning' && (
            <button
              onClick={startSprint}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
            >
              <PlayCircle className="w-5 h-5" />
              Start Sprint
            </button>
          )}
        </div>

        {/* Sprint Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-400">Duration</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {differenceInDays(new Date(sprint.end_date), new Date(sprint.start_date))} days
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-400">Story Points</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {completedPoints} / {totalPoints}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(0) : 0}% complete
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-400">Issues</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {issues.filter(i => i.status === 'done').length} / {issues.length}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-400">Days Left</span>
            </div>
            <div className={`text-2xl font-bold ${
              daysRemaining < 0 ? 'text-red-500' : 'text-white'
            }`}>
              {Math.abs(daysRemaining)}
            </div>
            {daysRemaining < 0 && (
              <div className="text-xs text-red-500 mt-1">Overdue</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Sprint Issues */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Sprint Issues ({issues.length})</h2>
          <div className="space-y-3">
            {issues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onRemove={() => removeFromSprint(issue.id)}
              />
            ))}

            {issues.length === 0 && (
              <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-500">No issues in sprint yet</p>
                <p className="text-sm text-slate-600 mt-2">Add issues from the backlog</p>
              </div>
            )}
          </div>
        </div>

        {/* Backlog */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Backlog ({backlogIssues.length})</h2>
          <div className="space-y-3">
            {backlogIssues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onAdd={() => addToSprint(issue.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, onAdd, onRemove }: any) {
  const priorityColors = {
    low: 'bg-slate-500/10 text-slate-500',
    medium: 'bg-blue-500/10 text-blue-500',
    high: 'bg-amber-500/10 text-amber-500',
    urgent: 'bg-red-500/10 text-red-500',
  };

  const typeIcons = {
    bug: '🐛',
    feature: '✨',
    improvement: '⚡',
    task: '📝',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[issue.type as keyof typeof typeIcons]}</span>
          <span className="text-sm text-slate-500">#{issue.issue_number}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[issue.priority as keyof typeof priorityColors]}`}>
            {issue.priority}
          </span>
          {issue.story_points && (
            <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded text-xs font-medium">
              {issue.story_points} pts
            </span>
          )}
        </div>
      </div>

      <h3 className="text-white font-medium mb-2">{issue.title}</h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {issue.assigned_user && (
            <div className="flex items-center gap-2">
              {issue.assigned_user.avatar_url && (
                <img
                  src={issue.assigned_user.avatar_url}
                  alt={issue.assigned_user.full_name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-slate-400">{issue.assigned_user.full_name}</span>
            </div>
          )}
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all"
          >
            Add to Sprint
          </button>
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-all"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
```

**13.1.3 Priority Matrix View (3 hours)**

```typescript
// New File: app/src/components/issues/PriorityMatrix.tsx
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PriorityMatrix({ workspaceId }: { workspaceId: string }) {
  const [issues, setIssues] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadIssues();
  }, [workspaceId]);

  const loadIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('status', ['todo', 'in_progress']);

    if (data) setIssues(data);
  };

  // Categorize issues into quadrants
  const quadrants = {
    urgent_important: issues.filter(i => i.priority === 'urgent'),
    important_not_urgent: issues.filter(i => i.priority === 'high'),
    urgent_not_important: issues.filter(i => i.priority === 'medium'),
    not_urgent_not_important: issues.filter(i => i.priority === 'low'),
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[800px]">
      {/* Quadrant 1: Urgent & Important */}
      <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-400">Urgent & Important</h3>
          <span className="text-2xl font-bold text-red-500">{quadrants.urgent_important.length}</span>
        </div>
        <p className="text-sm text-red-300 mb-4">Do First - Critical items</p>
        
        <div className="space-y-2 overflow-auto max-h-[600px]">
          {quadrants.urgent_important.map(issue => (
            <IssueQuadrantCard key={issue.id} issue={issue} color="red" />
          ))}
        </div>
      </div>

      {/* Quadrant 2: Important Not Urgent */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-400">Important, Not Urgent</h3>
          <span className="text-2xl font-bold text-blue-500">{quadrants.important_not_urgent.length}</span>
        </div>
        <p className="text-sm text-blue-300 mb-4">Schedule - Plan ahead</p>
        
        <div className="space-y-2 overflow-auto max-h-[600px]">
          {quadrants.important_not_urgent.map(issue => (
            <IssueQuadrantCard key={issue.id} issue={issue} color="blue" />
          ))}
        </div>
      </div>

      {/* Quadrant 3: Urgent Not Important */}
      <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-2 border-amber-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-400">Urgent, Not Important</h3>
          <span className="text-2xl font-bold text-amber-500">{quadrants.urgent_not_important.length}</span>
        </div>
        <p className="text-sm text-amber-300 mb-4">Delegate - If possible</p>
        
        <div className="space-y-2 overflow-auto max-h-[600px]">
          {quadrants.urgent_not_important.map(issue => (
            <IssueQuadrantCard key={issue.id} issue={issue} color="amber" />
          ))}
        </div>
      </div>

      {/* Quadrant 4: Not Urgent Not Important */}
      <div className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-2 border-slate-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-400">Not Urgent, Not Important</h3>
          <span className="text-2xl font-bold text-slate-500">{quadrants.not_urgent_not_important.length}</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">Eliminate - Minimize time</p>
        
        <div className="space-y-2 overflow-auto max-h-[600px]">
          {quadrants.not_urgent_not_important.map(issue => (
            <IssueQuadrantCard key={issue.id} issue={issue} color="slate" />
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueQuadrantCard({ issue, color }: { issue: any; color: string }) {
  return (
    <div className={`bg-slate-900/50 border border-${color}-500/20 rounded-lg p-3 hover:bg-slate-800/50 transition-colors cursor-pointer`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-white">{issue.title}</span>
        <span className="text-xs text-slate-500">#{issue.issue_number}</span>
      </div>
      {issue.due_date && (
        <div className="text-xs text-slate-400">
          Due: {new Date(issue.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
```

**13.1.3 Roadmap Timeline (3 hours)**

```typescript
// New File: app/src/components/issues/RoadmapTimeline.tsx
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { eachMonthOfInterval, format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

export default function RoadmapTimeline({ workspaceId }: { workspaceId: string }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date(new Date().setMonth(new Date().getMonth() + 6))),
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadIssues();
  }, [workspaceId]);

  const loadIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('*, project:projects(name, color)')
      .eq('workspace_id', workspaceId)
      .not('due_date', 'is', null)
      .order('due_date');

    if (data) setIssues(data);
  };

  const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

  // Group issues by project
  const projectGroups = issues.reduce((acc, issue) => {
    if (!issue.project_id) return acc;
    
    const projectId = issue.project_id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: issue.project,
        issues: [],
      };
    }
    acc[projectId].issues.push(issue);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white">Product Roadmap</h2>
      </div>

      <div className="overflow-auto">
        {/* Timeline Header */}
        <div className="flex border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="w-64 px-6 py-4 border-r border-slate-800">
            <span className="text-sm font-medium text-slate-400">Projects</span>
          </div>
          <div className="flex flex-1">
            {months.map(month => (
              <div
                key={month.toISOString()}
                className="flex-1 min-w-[150px] px-4 py-4 border-r border-slate-800"
              >
                <div className="text-sm font-medium text-white">
                  {format(month, 'MMM yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Rows */}
        {Object.values(projectGroups).map((group: any) => (
          <div key={group.project.id} className="flex border-b border-slate-800">
            <div className="w-64 px-6 py-4 border-r border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.project.color }}
                />
                <span className="text-white font-medium">{group.project.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {group.issues.length} issues
              </div>
            </div>

            <div className="flex flex-1 relative" style={{ minHeight: '80px' }}>
              {months.map(month => (
                <div
                  key={month.toISOString()}
                  className="flex-1 min-w-[150px] border-r border-slate-800"
                />
              ))}

              {/* Issue Blocks */}
              {group.issues.map((issue: any) => {
                const dueDate = new Date(issue.due_date);
                const monthIndex = months.findIndex(m => isSameMonth(m, dueDate));
                if (monthIndex === -1) return null;

                return (
                  <div
                    key={issue.id}
                    className="absolute top-2 h-12 rounded-lg px-2 py-1 text-xs text-white cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      left: `${(monthIndex / months.length) * 100}%`,
                      width: `${(1 / months.length) * 100}%`,
                      backgroundColor: group.project.color,
                    }}
                    title={issue.title}
                  >
                    <div className="truncate font-medium">{issue.title}</div>
                    <div className="text-xs opacity-75">#{issue.issue_number}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(projectGroups).length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No issues with due dates found
          </div>
        )}
      </div>
    </div>
  );
}
```


---

### 13.2 Custom Workflows (10 hours)

#### What You're Getting:

- Custom status workflows per project
- Automation rules (auto-assign, auto-label)
- Workflow visualizer
- State transition restrictions


#### Implementation Details:

**13.2.1 Workflow Schema (2 hours)**

```sql
-- Custom workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  statuses JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of status objects
  transitions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Allowed status transitions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger JSONB NOT NULL, -- {type: 'status_changed', from: 'todo', to: 'in_progress'}
  conditions JSONB DEFAULT '[]'::jsonb, -- Additional conditions
  actions JSONB NOT NULL, -- [{type: 'assign_to', user_id: '...'}, {type: 'add_label', label: 'in-review'}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_automation_rules_workspace ON automation_rules(workspace_id);
CREATE INDEX idx_automation_rules_project ON automation_rules(project_id);

-- RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage workflows" ON workflows
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage automation" ON automation_rules
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Function to execute automation rules
CREATE OR REPLACE FUNCTION execute_automation_rules()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  action JSONB;
BEGIN
  -- Find matching automation rules
  FOR rule IN
    SELECT * FROM automation_rules
    WHERE is_active = true
    AND (project_id = NEW.project_id OR project_id IS NULL)
    AND workspace_id = NEW.workspace_id
  LOOP
    -- Check if trigger matches
    IF rule.trigger->>'type' = 'status_changed' THEN
      IF OLD.status != NEW.status 
         AND (rule.trigger->>'from' IS NULL OR OLD.status = rule.trigger->>'from')
         AND (rule.trigger->>'to' IS NULL OR NEW.status = rule.trigger->>'to')
      THEN
        -- Execute actions
        FOR action IN SELECT * FROM jsonb_array_elements(rule.actions)
        LOOP
          -- Auto-assign
          IF action->>'type' = 'assign_to' THEN
            UPDATE issues 
            SET assigned_to = (action->>'user_id')::uuid 
            WHERE id = NEW.id;
          END IF;
          
          -- Auto-label
          IF action->>'type' = 'add_label' THEN
            UPDATE issues 
            SET labels = array_append(labels, action->>'label')
            WHERE id = NEW.id;
          END IF;
          
          -- Send notification
          IF action->>'type' = 'notify' THEN
            -- Insert notification (implement notification system)
            NULL;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_trigger
AFTER UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION execute_automation_rules();
```

**13.2.2 Workflow Builder UI (5 hours)**

```typescript
// New File: app/src/components/workflows/WorkflowBuilder.tsx
'use client';

import { useState } from 'react';
import { Plus, X, ArrowRight, Settings } from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Status {
  id: string;
  name: string;
  color: string;
  category: 'todo' | 'in_progress' | 'done' | 'canceled';
}

interface Transition {
  from: string;
  to: string;
}

export default function WorkflowBuilder({ onSave }: { onSave: (workflow: any) => void }) {
  const [workflowName, setWorkflowName] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([
    { id: '1', name: 'Backlog', color: '#64748b', category: 'todo' },
    { id: '2', name: 'To Do', color: '#3b82f6', category: 'todo' },
    { id: '3', name: 'In Progress', color: '#f59e0b', category: 'in_progress' },
    { id: '4', name: 'Done', color: '#10b981', category: 'done' },
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    statuses.map((status, index) => ({
      id: status.id,
      type: 'default',
      position: { x: index * 250, y: 100 },
      data: { label: status.name },
      style: {
        background: status.color,
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '600',
      },
    }))
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
    { id: 'e3-4', source: '3', target: '4', animated: true },
  ]);

  const onConnect = (params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  };

  const addStatus = () => {
    const newStatus: Status = {
      id: Date.now().toString(),
      name: 'New Status',
      color: '#64748b',
      category: 'todo',
    };

    setStatuses([...statuses, newStatus]);

    const newNode: Node = {
      id: newStatus.id,
      type: 'default',
      position: { x: statuses.length * 250, y: 100 },
      data: { label: newStatus.name },
      style: {
        background: newStatus.color,
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
      },
    };

    setNodes([...nodes, newNode]);
  };

  const removeStatus = (statusId: string) => {
    setStatuses(statuses.filter(s => s.id !== statusId));
    setNodes(nodes.filter(n => n.id !== statusId));
    setEdges(edges.filter(e => e.source !== statusId && e.target !== statusId));
  };

  const updateStatus = (statusId: string, updates: Partial<Status>) => {
    setStatuses(statuses.map(s => (s.id === statusId ? { ...s, ...updates } : s)));
    setNodes(
      nodes.map(n =>
        n.id === statusId
          ? {
              ...n,
              data: { label: updates.name || n.data.label },
              style: {
                ...n.style,
                background: updates.color || n.style?.background,
              },
            }
          : n
      )
    );
  };

  const handleSave = () => {
    const transitions: Transition[] = edges.map(edge => ({
      from: edge.source,
      to: edge.target,
    }));

    onSave({
      name: workflowName,
      statuses,
      transitions,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Create Custom Workflow</h2>
        
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name (e.g., Software Development)"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
        />
      </div>

      {/* Workflow Visualization */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl mb-6" style={{ height: '400px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Status List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Statuses</h3>
          <button
            onClick={addStatus}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Status
          </button>
        </div>

        <div className="space-y-3">
          {statuses.map(status => (
            <div
              key={status.id}
              className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl"
            >
              <input
                type="color"
                value={status.color}
                onChange={(e) => updateStatus(status.id, { color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />

              <input
                type="text"
                value={status.name}
                onChange={(e) => updateStatus(status.id, { name: e.target.value })}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />

              <select
                value={status.category}
                onChange={(e) => updateStatus(status.id, { category: e.target.value as any })}
                className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="canceled">Canceled</option>
              </select>

              <button
                onClick={() => removeStatus(status.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg"
                disabled={statuses.length <= 2}
              >
                <X className="w-5 h-5 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!workflowName || statuses.length < 2}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium"
        >
          Save Workflow
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**13.2.3 Automation Rules Builder (3 hours)**

```typescript
// New File: app/src/components/workflows/AutomationRuleBuilder.tsx
import { useState } from 'react';
import { Zap, Plus, X } from 'lucide-react';

interface AutomationRule {
  name: string;
  trigger: {
    type: 'status_changed' | 'assigned' | 'label_added' | 'due_date_approaching';
    from?: string;
    to?: string;
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  actions: Array<{
    type: 'assign_to' | 'add_label' | 'remove_label' | 'notify' | 'move_to_sprint';
    value?: string;
  }>;
}

export default function AutomationRuleBuilder({ onSave }: { onSave: (rule: AutomationRule) => void }) {
  const [rule, setRule] = useState<AutomationRule>({
    name: '',
    trigger: { type: 'status_changed' },
    conditions: [],
    actions: [],
  });

  const addCondition = () => {
    setRule({
      ...rule,
      conditions: [...rule.conditions, { field: 'priority', operator: 'equals', value: '' }],
    });
  };

  const addAction = () => {
    setRule({
      ...rule,
      actions: [...rule.actions, { type: 'assign_to' }],
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Zap className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Create Automation Rule</h2>
          <p className="text-slate-400">Automate repetitive tasks and workflows</p>
        </div>
      </div>

      {/* Rule Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name</label>
        <input
          type="text"
          value={rule.name}
          onChange={(e) => setRule({ ...rule, name: e.target.value })}
          placeholder="e.g., Auto-assign to dev team"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
        />
      </div>

      {/* Trigger */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">When</label>
        <div className="grid grid-cols-3 gap-4">
          <select
            value={rule.trigger.type}
            onChange={(e) => setRule({ ...rule, trigger: { ...rule.trigger, type: e.target.value as any } })}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          >
            <option value="status_changed">Status changes</option>
            <option value="assigned">Issue assigned</option>
            <option value="label_added">Label added</option>
            <option value="due_date_approaching">Due date approaching</option>
          </select>

          {rule.trigger.type === 'status_changed' && (
            <>
              <select
                value={rule.trigger.from || ''}
                onChange={(e) => setRule({ ...rule, trigger: { ...rule.trigger, from: e.target.value } })}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              >
                <option value="">From any status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              <select
                value={rule.trigger.to || ''}
                onChange={(e) => setRule({ ...rule, trigger: { ...rule.trigger, to: e.target.value } })}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              >
                <option value="">To any status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-slate-300">Conditions (optional)</label>
          <button
            onClick={addCondition}
            className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>
        </div>

        {rule.conditions.map((condition, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={condition.field}
              onChange={(e) => {
                const newConditions = [...rule.conditions];
                newConditions[index].field = e.target.value;
                setRule({ ...rule, conditions: newConditions });
              }}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="labels">Has Label</option>
            </select>

            <select
              value={condition.operator}
              onChange={(e) => {
                const newConditions = [...rule.conditions];
                newConditions[index].operator = e.target.value;
                setRule({ ...rule, conditions: newConditions });
              }}
              className="w-32 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not equals</option>
            </select>

            <input
              type="text"
              value={condition.value}
              onChange={(e) => {
                const newConditions = [...rule.conditions];
                newConditions[index].value = e.target.value;
                setRule({ ...rule, conditions: newConditions });
              }}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              placeholder="Value"
            />

            <button
              onClick={() => setRule({ ...rule, conditions: rule.conditions.filter((_, i) => i !== index) })}
              className="p-2 hover:bg-red-500/10 rounded-lg"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-slate-300">Then</label>
          <button
            onClick={addAction}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Action
          </button>
        </div>

        {rule.actions.map((action, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={action.type}
              onChange={(e) => {
                const newActions = [...rule.actions];
                newActions[index].type = e.target.value as any;
                setRule({ ...rule, actions: newActions });
              }}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="assign_to">Assign to</option>
              <option value="add_label">Add label</option>
              <option value="remove_label">Remove label</option>
              <option value="notify">Send notification</option>
              <option value="move_to_sprint">Move to sprint</option>
            </select>

            <input
              type="text"
              value={action.value || ''}
              onChange={(e) => {
                const newActions = [...rule.actions];
                newActions[index].value = e.target.value;
                setRule({ ...rule, actions: newActions });
              }}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              placeholder="User ID, label name, etc."
            />

            <button
              onClick={() => setRule({ ...rule, actions: rule.actions.filter((_, i) => i !== index) })}
              className="p-2 hover:bg-red-500/10 rounded-lg"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        ))}

        {rule.actions.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-slate-800/50 border border-slate-700 rounded-xl">
            Add at least one action
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={() => onSave(rule)}
        disabled={!rule.name || rule.actions.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium"
      >
        Create Automation Rule
        </button>
    </div>
  );
}
```


---

## PHASE 14: UX Polish \& Retention

**Priority:** HIGH
**Timeline:** Week 8 (20-25 hours)
**Goal:** Make the app delightful to use daily

### 14.1 Onboarding Flow (8 hours)

#### What You're Getting:

- Interactive product tour
- Sample workspace setup
- Progressive feature discovery
- Personalization questions
- Achievement/milestone celebrations


#### Implementation Details:

**14.1.1 Onboarding Schema (2 hours)**

```sql
-- User onboarding progress
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Steps completed
  steps_completed JSONB DEFAULT '[]'::jsonb,
  current_step TEXT,
  
  -- Personalization
  role TEXT, -- 'developer', 'designer', 'manager', 'freelancer', etc.
  team_size TEXT, -- 'solo', 'small', 'medium', 'large'
  use_cases TEXT[], -- ['project-management', 'note-taking', 'time-tracking']
  
  -- Progress
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, workspace_id)
);

-- Feature discovery tracking
CREATE TABLE feature_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL, -- 'kanban-board', 'time-tracking', etc.
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, feature_id)
);

CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_feature_hints_user ON feature_hints(user_id);

-- RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding" ON onboarding_progress
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own hints" ON feature_hints
  USING (user_id = auth.uid());
```

**14.1.2 Onboarding Wizard Component (4 hours)**

```typescript
// New File: app/src/components/onboarding/OnboardingWizard.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Check, ArrowRight, Sparkles, Users, Briefcase, Clock, FileText } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to WorkHub!',
    description: "Let's get you set up in just a few steps",
  },
  {
    id: 'role',
    title: 'What's your role?',
    description: 'This helps us customize your experience',
  },
  {
    id: 'team-size',
    title: 'Team size',
    description: 'How many people will be using this workspace?',
  },
  {
    id: 'use-cases',
    title: 'What will you use WorkHub for?',
    description: 'Select all that apply',
  },
  {
    id: 'sample-data',
    title: 'Want us to set up some examples?',
    description: "We'll create sample projects and tasks so you can explore",
  },
  {
    id: 'complete',
    title: "You're all set!",
    description: "Let's start building something great",
  },
];

export default function OnboardingWizard({ workspaceId, onComplete }: any) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    role: '',
    teamSize: '',
    useCases: [] as string[],
    createSampleData: false,
  });
  const supabase = createClientComponentClient();

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Save onboarding progress
    await supabase.from('onboarding_progress').upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      workspace_id: workspaceId,
      steps_completed: ONBOARDING_STEPS.map(s => s.id),
      is_completed: true,
      completed_at: new Date().toISOString(),
      role: answers.role,
      team_size: answers.teamSize,
      use_cases: answers.useCases,
    });

    // Create sample data if requested
    if (answers.createSampleData) {
      await createSampleWorkspace(workspaceId);
    }

    onComplete();
  };

  const createSampleWorkspace = async (workspaceId: string) => {
    // Create sample project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name: 'Sample Project',
        description: 'This is a sample project to help you get started',
        color: '#3b82f6',
      })
      .select()
      .single();

    if (project) {
      // Create sample tasks
      await supabase.from('tasks').insert([
        {
          workspace_id: workspaceId,
          project_id: project.id,
          title: 'Welcome to WorkHub! 👋',
          description: 'This is your first task. Click to edit or mark as complete.',
          priority: 'medium',
        },
        {
          workspace_id: workspaceId,
          project_id: project.id,
          title: 'Explore the Kanban board',
          description: 'Drag and drop tasks between columns to change their status.',
          priority: 'low',
        },
        {
          workspace_id: workspaceId,
          project_id: project.id,
          title: 'Try time tracking',
          description: 'Click the timer icon to start tracking time on this task.',
          priority: 'low',
        },
      ]);

      // Create sample note
      await supabase.from('notes').insert({
        workspace_id: workspaceId,
        title: 'Getting Starte
<span style="display:none">[^9_1]</span>

<div align="center">⁂</div>

[^9_1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/70732981/2e19a42f-5ceb-4e01-956f-f6bb2239c669/COMPLETE_IMPLEMENTATION_PLAN.md

---

# Continue

```typescript
        workspace_id: workspaceId,
        title: 'Getting Started Guide',
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Welcome to WorkHub!' }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Here are some quick tips to get you started:',
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Create projects to organize your work',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'Use @ to mention team members' },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'Track time on tasks for better insights' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
    }
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{
              width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {ONBOARDING_STEPS.map((s, index) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index <= currentStep
                    ? 'bg-blue-500 w-8'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            ```
            <h2 className="text-3xl font-bold text-white mb-2">{step.title}</h2>
            ```
            ```
            <p className="text-slate-400">{step.description}</p>
            ```
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {step.id === 'welcome' && (
              <div className="text-center space-y-4">
                <p className="text-lg text-slate-300">
                  WorkHub helps you manage projects, track time, and collaborate with your team - all in one place.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="p-4 bg-slate-800 rounded-xl">
                    <Briefcase className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    ```
                    <p className="text-sm text-slate-300">Projects</p>
                    ```
                  </div>
                  <div className="p-4 bg-slate-800 rounded-xl">
                    <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    ```
                    <p className="text-sm text-slate-300">Time Tracking</p>
                    ```
                  </div>
                  <div className="p-4 bg-slate-800 rounded-xl">
                    <FileText className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    ```
                    <p className="text-sm text-slate-300">Notes</p>
                    ```
                  </div>
                </div>
              </div>
            )}

            {step.id === 'role' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'developer', label: 'Developer', icon: '💻' },
                  { value: 'designer', label: 'Designer', icon: '🎨' },
                  { value: 'manager', label: 'Manager', icon: '📊' },
                  { value: 'freelancer', label: 'Freelancer', icon: '🚀' },
                  { value: 'student', label: 'Student', icon: '📚' },
                  { value: 'other', label: 'Other', icon: '👤' },
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setAnswers({ ...answers, role: role.value })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      answers.role === role.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    ```
                    <div className="text-3xl mb-2">{role.icon}</div>
                    ```
                    ```
                    <div className="text-white font-medium">{role.label}</div>
                    ```
                  </button>
                ))}
              </div>
            )}

            {step.id === 'team-size' && (
              <div className="space-y-3">
                {[
                  { value: 'solo', label: 'Just me', description: 'Personal workspace' },
                  { value: 'small', label: '2-10 people', description: 'Small team' },
                  { value: 'medium', label: '11-50 people', description: 'Growing company' },
                  { value: 'large', label: '50+ people', description: 'Large organization' },
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setAnswers({ ...answers, teamSize: size.value })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      answers.teamSize === size.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-400" />
                      <div className="flex-1">
                        ```
                        <div className="text-white font-medium">{size.label}</div>
                        ```
                        ```
                        <div className="text-sm text-slate-400">{size.description}</div>
                        ```
                      </div>
                      {answers.teamSize === size.value && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step.id === 'use-cases' && (
              <div className="space-y-3">
                {[
                  { value: 'project-management', label: 'Project Management', icon: '📋' },
                  { value: 'time-tracking', label: 'Time Tracking', icon: '⏱️' },
                  { value: 'note-taking', label: 'Note Taking & Documentation', icon: '📝' },
                  { value: 'team-collaboration', label: 'Team Collaboration', icon: '👥' },
                  { value: 'personal-productivity', label: 'Personal Productivity', icon: '✨' },
                ].map((useCase) => (
                  <button
                    key={useCase.value}
                    onClick={() => {
                      const current = answers.useCases;
                      setAnswers({
                        ...answers,
                        useCases: current.includes(useCase.value)
                          ? current.filter((v) => v !== useCase.value)
                          : [...current, useCase.value],
                      });
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      answers.useCases.includes(useCase.value)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      ```
                      <span className="text-2xl">{useCase.icon}</span>
                      ```
                      ```
                      <span className="flex-1 text-white font-medium">{useCase.label}</span>
                      ```
                      {answers.useCases.includes(useCase.value) && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step.id === 'sample-data' && (
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    answers.createSampleData
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                  onClick={() =>
                    setAnswers({ ...answers, createSampleData: !answers.createSampleData })
                  }
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        answers.createSampleData
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {answers.createSampleData && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-2">
                        Yes, create sample workspace
                      </h3>
                      <p className="text-sm text-slate-400">
                        We'll create a sample project with tasks and notes so you can explore all features
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-slate-500">
                  You can delete the sample data anytime
                </div>
              </div>
            )}

            {step.id === 'complete' && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    🎉 Your workspace is ready!
                  </h3>
                  <p className="text-slate-400">
                    {answers.createSampleData
                      ? "We've set up some examples to help you get started"
                      : "Let's create your first project"}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
                  ```
                  <h4 className="text-white font-medium mb-3">Quick Tips:</h4>
                  ```
                  <ul className="text-left text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      ```
                      <span className="text-blue-500">•</span>
                      ```
                      ```
                      Press <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Cmd+K</kbd> to quickly search anything
                      ```
                    </li>
                    <li className="flex items-start gap-2">
                      ```
                      <span className="text-blue-500">•</span>
                      ```
                      Use @ to mention teammates in notes
                    </li>
                    <li className="flex items-start gap-2">
                      ```
                      <span className="text-blue-500">•</span>
                      ```
                      Click the timer icon to start tracking time
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                Back
              </button>
            )}

            {currentStep < ONBOARDING_STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                disabled={
                  (step.id === 'role' && !answers.role) ||
                  (step.id === 'team-size' && !answers.teamSize) ||
                  (step.id === 'use-cases' && answers.useCases.length === 0)
                }
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**14.1.3 Feature Discovery Tooltips (2 hours)**

```typescript
// New File: app/src/components/onboarding/FeatureHint.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X, Lightbulb } from 'lucide-react';

interface FeatureHintProps {
  featureId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  targetRef?: React.RefObject<HTMLElement>;
}

export default function FeatureHint({
  featureId,
  title,
  description,
  position = 'bottom',
  targetRef,
}: FeatureHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkIfShown();
  }, [featureId]);

  const checkIfShown = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from('feature_hints')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('feature_id', featureId)
      .single();

    if (!data) {
      // Not shown yet, display after a short delay
      setTimeout(() => setIsVisible(true), 1000);
      
      // Mark as shown
      await supabase.from('feature_hints').insert({
        user_id: user.user.id,
        feature_id: featureId,
      });
    }
  };

  const dismiss = async () => {
    setIsVisible(false);
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from('feature_hints')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('user_id', user.user.id)
      .eq('feature_id', featureId);
  };

  if (!isVisible) return null;

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} z-50 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[2px] rounded-xl shadow-2xl">
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Lightbulb className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex-1">
              ```
              <h4 className="text-white font-semibold mb-1">{title}</h4>
              ```
              ```
              <p className="text-sm text-slate-300">{description}</p>
              ```
            </div>

            <button
              onClick={dismiss}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <button
            onClick={dismiss}
            className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>

      {/* Arrow */}
      <div
        className={`absolute ${
          position === 'bottom'
            ? 'bottom-full left-1/2 -translate-x-1/2'
            : position === 'top'
            ? 'top-full left-1/2 -translate-x-1/2 rotate-180'
            : ''
        } w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rotate-45`}
      />
    </div>
  );
}
```


***

### 14.2 Command Palette (6 hours)

#### What You're Getting:

- Global keyboard shortcuts (Cmd+K)
- Quick actions (create task, start timer, etc.)
- Search across all content
- Recent items
- Calculator and other utilities


#### Implementation Details:

**14.2.1 Command Palette Component (6 hours)**

```typescript
// New File: app/src/components/CommandPalette.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Search,
  Plus,
  Clock,
  FileText,
  CheckSquare,
  Calendar,
  Users,
  Settings,
  Calculator,
  Hash,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'create' | 'navigate' | 'search' | 'utility';
  keywords?: string[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        setQuery('');
      }

      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Load recent items
  useEffect(() => {
    if (isOpen) {
      loadRecentItems();
    }
  }, [isOpen]);

  const loadRecentItems = async () => {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, created_at')
      .order('updated_at', { ascending: false })
      .limit(3);

    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, created_at')
      .order('updated_at', { ascending: false })
      .limit(3);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .order('updated_at', { ascending: false })
      .limit(3);

    setRecentItems([
      ...(tasks || []).map((t) => ({ ...t, type: 'task' })),
      ...(notes || []).map((n) => ({ ...n, type: 'note', title: n.title })),
      ...(projects || []).map((p) => ({ ...p, type: 'project', title: p.name })),
    ]);
  };

  // Quick actions
  const commands: Command[] = [
    {
      id: 'create-task',
      label: 'Create Task',
      description: 'Add a new task',
      icon: <CheckSquare className="w-5 h-5" />,
      action: () => router.push('/dashboard/tasks/new'),
      category: 'create',
      keywords: ['new', 'add', 'todo'],
    },
    {
      id: 'create-note',
      label: 'Create Note',
      description: 'Start a new note',
      icon: <FileText className="w-5 h-5" />,
      action: () => router.push('/dashboard/notes/new'),
      category: 'create',
      keywords: ['new', 'write', 'document'],
    },
    {
      id: 'create-project',
      label: 'Create Project',
      description: 'Start a new project',
      icon: <Plus className="w-5 h-5" />,
      action: () => router.push('/dashboard/projects/new'),
      category: 'create',
      keywords: ['new', 'workspace'],
    },
    {
      id: 'start-timer',
      label: 'Start Timer',
      description: 'Begin time tracking',
      icon: <Clock className="w-5 h-5" />,
      action: () => {
        // TODO: Open timer modal
        setIsOpen(false);
      },
      category: 'utility',
      keywords: ['track', 'time'],
    },
    {
      id: 'calendar',
      label: 'Open Calendar',
      icon: <Calendar className="w-5 h-5" />,
      action: () => router.push('/dashboard/calendar'),
      category: 'navigate',
    },
    {
      id: 'team',
      label: 'Team Members',
      icon: <Users className="w-5 h-5" />,
      action: () => router.push('/dashboard/team'),
      category: 'navigate',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      action: () => router.push('/dashboard/settings'),
      category: 'navigate',
    },
  ];

  // Search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    // Calculator mode
    if (query.match(/^[\d+\-*/().]+$/)) {
      try {
        const result = eval(query);
        setResults([
          {
            id: 'calc',
            type: 'calculator',
            label: `= ${result}`,
            icon: <Calculator className="w-5 h-5" />,
          },
        ]);
      } catch (e) {
        // Invalid expression
      }
      return;
    }

    // Filter commands
    const matchingCommands = commands.filter((cmd) => {
      const searchStr = query.toLowerCase();
      return (
        cmd.label.toLowerCase().includes(searchStr) ||
        cmd.description?.toLowerCase().includes(searchStr) ||
        cmd.keywords?.some((k) => k.includes(searchStr))
      );
    });

    // Search database
    searchDatabase(query).then((dbResults) => {
      setResults([
        ...matchingCommands.map((c) => ({ ...c, type: 'command' })),
        ...dbResults,
      ]);
      setSelectedIndex(0);
    });
  }, [query]);

  const searchDatabase = async (searchQuery: string) => {
    const results: any[] = [];

    // Search tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .ilike('title', `%${searchQuery}%`)
      .limit(5);

    if (tasks) {
      results.push(
        ...tasks.map((t) => ({
          ...t,
          type: 'task',
          label: t.title,
          icon: <CheckSquare className="w-5 h-5" />,
          action: () => router.push(`/dashboard/tasks/${t.id}`),
        }))
      );
    }

    // Search notes
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title')
      .ilike('title', `%${searchQuery}%`)
      .limit(5);

    if (notes) {
      results.push(
        ...notes.map((n) => ({
          ...n,
          type: 'note',
          label: n.title,
          icon: <FileText className="w-5 h-5" />,
          action: () => router.push(`/dashboard/notes/${n.id}`),
        }))
      );
    }

    // Search projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${searchQuery}%`)
      .limit(5);

    if (projects) {
      results.push(
        ...projects.map((p) => ({
          ...p,
          type: 'project',
          label: p.name,
          icon: <Hash className="w-5 h-5" />,
          action: () => router.push(`/dashboard/projects/${p.id}`),
        }))
      );
    }

    return results;
  };

  const handleSelect = (item: any) => {
    if (item.action) {
      item.action();
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const displayItems = query ? results : recentItems;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32 px-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-auto">
          {!query && recentItems.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
                Recent
              </div>
              {recentItems.map((item, index) => (
                <CommandItem
                  key={item.id}
                  item={{
                    ...item,
                    label: item.title,
                    icon:
                      item.type === 'task' ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : item.type === 'note' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Hash className="w-5 h-5" />
                      ),
                    action: () =>
                      router.push(`/dashboard/${item.type}s/${item.id}`),
                  }}
                  isSelected={index === selectedIndex}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </div>
          )}

          {query && results.length > 0 && (
            <div className="p-2">
              {/* Group by category */}
              {['command', 'task', 'note', 'project', 'calculator'].map(
                (category) => {
                  const categoryItems = results.filter(
                    (r) => r.type === category
                  );
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category} className="mb-4 last:mb-0">
                      <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
                        {category === 'command'
                          ? 'Commands'
                          : category === 'calculator'
                          ? 'Calculator'
                          : `${category}s`}
                      </div>
                      {categoryItems.map((item, index) => {
                        const globalIndex = results.indexOf(item);
                        return (
                          <CommandItem
                            key={item.id}
                            item={item}
                            isSelected={globalIndex === selectedIndex}
                            onClick={() => handleSelect(item)}
                          />
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No results found for "{query}"
            </div>
          )}

          {!query && recentItems.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500 mb-4">
                Type to search or run a command
              </p>
              <div className="text-sm text-slate-600">
                <p>Try: "create task" or "calendar"</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              ```
              <kbd className="px-2 py-1 bg-slate-800 rounded">↑↓</kbd>
              ```
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              ```
              <kbd className="px-2 py-1 bg-slate-800 rounded">↵</kbd>
              ```
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            ```
            <kbd className="px-2 py-1 bg-slate-800 rounded">⌘K</kbd>
            ```
            <span>Toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandItem({
  item,
  isSelected,
  onClick,
}: {
  item: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <div className={isSelected ? 'text-white' : 'text-slate-500'}>
        {item.icon}
      </div>
      <div className="flex-1 text-left">
        ```
        <div className="font-medium">{item.label}</div>
        ```
        {item.description && (
          <div
            className={`text-xs ${
              isSelected ? 'text-blue-200' : 'text-slate-500'
            }`}
          >
            {item.description}
          </div>
        )}
      </div>
      {item.category && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {item.category}
        </div>
      )}
    </button>
  );
}
```


***

### 14.3 Notifications System (6 hours)

#### What You're Getting:

- Real-time in-app notifications
- Email digest option
- Notification preferences
- Activity feed
- Push notifications (optional)


#### Implementation Details:

**14.3.1 Notifications Schema (2 hours)**

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned',
    'task_completed',
    'task_comment',
    'mention',
    'project_invite',
    'deadline_approaching',
    'time_entry_reminder'
  )),
  title TEXT NOT NULL,
  message TEXT,
  
  -- Related entities
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id), -- Who triggered the notification
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- In-app notifications
  task_assigned BOOLEAN DEFAULT true,
  task_completed BOOLEAN DEFAULT true,
  task_comment BOOLEAN DEFAULT true,
  mentions BOOLEAN DEFAULT true,
  project_updates BOOLEAN DEFAULT true,
  
  -- Email notifications
  email_daily_digest BOOLEAN DEFAULT false,
  email_weekly_summary BOOLEAN DEFAULT false,
  email_important_only BOOLEAN DEFAULT true,
  
  -- Push notifications (for future mobile app)
  push_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences" ON notification_preferences
  USING (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_workspace_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_note_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_preferences RECORD;
BEGIN
  -- Check user preferences
  SELECT * INTO v_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- Don't create if user has disabled this type
  IF v_preferences IS NOT NULL THEN
    CASE p_type
      WHEN 'task_assigned' THEN
        IF NOT v_preferences.task_assigned THEN
          RETURN NULL;
        END IF;
      WHEN 'task_completed' THEN
        IF NOT v_preferences.task_completed THEN
          RETURN NULL;
        END IF;
      WHEN 'mention' THEN
        IF NOT v_preferences.mentions THEN
          RETURN NULL;
        END IF;
    END CASE;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    workspace_id,
    type,
    title,
    message,
    actor_id,
    task_id,
    project_id,
    note_id
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_type,
    p_title,
    p_message,
    p_actor_id,
    p_task_id,
    p_project_id,
    p_note_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications on task assignment
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    PERFORM create_notification(
      NEW.assigned_to,
      NEW.workspace_id,
      'task_assigned',
      'New task assigned to you',
      NEW.title,
      auth.uid(),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assigned_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assigned();
```

**14.3.2 Notification Center Component (4 hours)**

```typescript
// New File: app/src/components/NotificationCenter.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bell, Check, CheckCheck, X, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
    subscribeToNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(full_name, avatar_url)
      `)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.message,
              icon: '/icon.png',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate to related entity
    if (notification.task_id) {
      router.push(`/dashboard/tasks/${notification.task_id}`);
    } else if (notification.project_id) {
      router.push(`/dashboard/projects/${notification.project_id}`);
    } else if (notification.note_id) {
      router.push(`/dashboard/notes/${notification.note_id}`);
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      task_assigned: '📋',
      task_completed: '✅',
      task_comment: '💬',
      mention: '@',
      project_invite: '🎯',
      deadline_approaching: '⏰',
      time_entry_reminder: '⏱️',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-800 rounded-xl transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            ```
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            ```
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard/settings/notifications')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Notification settings"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                ```
                <div className="text-4xl mb-3">🔔</div>
                ```
                ```
                <p className="text-slate-500">No notifications yet</p>
                ```
                <p className="text-sm text-slate-600 mt-1">
                  We'll notify you about important updates
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-slate-800/50 transition-colors ${
                      !notification.read ? 'bg-blue-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4
                            className={`font-medium ${
                              !notification.read
                                ? 'text-white'
                                : 'text-slate-300'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>

                        {notification.message && (
                          <p className="text-sm text-slate-400 mb-2">
                            {notification.message}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {notification.actor && (
                            <>
                              {notification.actor.avatar_url && (
                                <img
                                  src={notification.actor.avatar_url}
                                  alt={notification.actor.full_name}
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span>{notification.actor.full_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Mark as read */}
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={() => {
                  router.push('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="w-full py-2 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```


***

## 🎉 CONGRATULATIONS! YOU'RE DONE!

You now have a **production-ready SaaS application** with:

✅ **Core Features:**

- Multi-workspace architecture
- Task \& project management (Kanban, List, Calendar views)
- Time tracking with analytics
- Rich text notes with collaboration
- Team management \& permissions
- File uploads \& management

✅ **Advanced Features:**

- Real-time collaboration
- Custom workflows \& automation
- Sprint planning \& issue tracking
- Financial tracking \& budgeting
- Templates system
- Command palette (Cmd+K)
- Notifications system

✅ **Polish:**

- Beautiful, modern UI
- Interactive onboarding
- Feature discovery
- Dark mode
- Responsive design
- Keyboard shortcuts

***

## Next Steps (Optional Enhancements)

### Phase 15: Mobile App (30-40 hours)

- React Native or Flutter app
- Offline-first architecture
- Push notifications
- Mobile-optimized UI


### Phase 16: Integrations (20-30 hours)

- GitHub integration
- Slack/Discord webhooks
- Google Calendar sync
- Zapier/Make.com compatibility


### Phase 17: AI Features (15-20 hours)

- AI task suggestions
- Smart scheduling
- Auto-categorization
- Meeting summaries


### Phase 18: Advanced Analytics (10-15 hours)

- Custom reports builder
- Data export (CSV, PDF)
- Advanced charts
- Predictive insights

***

## Deployment Checklist

Before going live:

- [ ] Set up production Supabase project
- [ ] Configure environment variables
- [ ] Set up custom domain
- [ ] Enable SSL/HTTPS
- [ ] Configure CORS
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics (PostHog, Plausible)
- [ ] Set up backup strategy
- [ ] Configure CDN for assets
- [ ] Test payment flow thoroughly
- [ ] Set up monitoring \& alerts
- [ ] Create privacy policy \& terms
- [ ] Set up customer support (Intercom, Crisp)

***

**Total Development Time: 200-250 hours (6-8 weeks full-time)**

This gives you a **world-class productivity SaaS** comparable to Linear, ClickUp, and Notion! 🚀
<span style="display:none">[^10_1]</span>

<div align="center">⁂</div>

[^10_1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/70732981/2e19a42f-5ceb-4e01-956f-f6bb2239c669/COMPLETE_IMPLEMENTATION_PLAN.md

