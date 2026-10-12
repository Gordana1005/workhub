'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import AppShell from '@/components/shell/AppShell'
import type { CreateKind } from '@/components/shell/NewMenu'
import CreateWorkspaceDialog from '@/components/create/CreateWorkspaceDialog'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'
import QuickTaskForm from '@/components/create/QuickTaskForm'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces)
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrateWorkspace)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)

  useEffect(() => {
    // Restore the saved workspace selection first (client only, after hydration), then refresh from the server
    hydrateWorkspace()
    fetchWorkspaces()
  }, [fetchWorkspaces, hydrateWorkspace])

  const onCreate = (kind: CreateKind) => {
    if (kind === 'note') {
      router.push('/dashboard/notes')
      return
    }
    if (kind === 'plan') {
      router.push('/dashboard/plans')
      return
    }
    setCreateKind(kind)
  }

  return (
    <ErrorBoundary>
      <AppShell onCreate={onCreate}>
        {children}
        <CreateWorkspaceDialog open={createKind === 'workspace'} onClose={() => setCreateKind(null)} />
        <CreateProjectDialog open={createKind === 'project'} onClose={() => setCreateKind(null)} />
        <QuickTaskForm open={createKind === 'task'} onClose={() => setCreateKind(null)} />
      </AppShell>
    </ErrorBoundary>
  )
}
