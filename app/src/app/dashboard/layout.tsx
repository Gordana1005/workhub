'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import AppShell from '@/components/shell/AppShell'
import type { CreateKind } from '@/components/shell/NewMenu'
import CreateWorkspaceDialog from '@/components/create/CreateWorkspaceDialog'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'
import QuickTaskForm from '@/components/create/QuickTaskForm'
import FirstWorkspace from '@/components/onboarding/FirstWorkspace'
import SearchHost from '@/components/search/SearchHost'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces)
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrateWorkspace)
  const workspaceCount = useWorkspaceStore((state) => state.workspaces.length)
  const workspaceError = useWorkspaceStore((state) => state.error)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  // True once the first workspace fetch has settled, so a brand-new user never sees a flash of the empty dashboard
  const [workspacesChecked, setWorkspacesChecked] = useState(false)

  useEffect(() => {
    // Restore the saved workspace selection first (client only, after hydration), then refresh from the server
    hydrateWorkspace()
    fetchWorkspaces().finally(() => setWorkspacesChecked(true))
  }, [fetchWorkspaces, hydrateWorkspace])

  // Stable identity: the shell binds the "N" shortcut to it and passes it to the menu / FAB.
  const onCreate = useCallback(
    (kind: CreateKind) => {
      if (kind === 'note') {
        router.push('/dashboard/notes')
        return
      }
      if (kind === 'plan') {
        router.push('/dashboard/plans')
        return
      }
      setCreateKind(kind)
    },
    [router]
  )

  // Signed in but no workspace (skipped onboarding, e-mail confirmation, invited but not joined): guide them to create one.
  // A failed fetch is NOT treated as "no workspaces" - the normal dashboard shows its own error handling then.
  if (workspacesChecked && workspaceCount === 0 && !workspaceError) {
    return (
      <ErrorBoundary>
        <FirstWorkspace />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <AppShell onCreate={onCreate}>
        {children}
        <CreateWorkspaceDialog open={createKind === 'workspace'} onClose={() => setCreateKind(null)} />
        <CreateProjectDialog open={createKind === 'project'} onClose={() => setCreateKind(null)} />
        <QuickTaskForm open={createKind === 'task'} onClose={() => setCreateKind(null)} />
        <SearchHost onCreate={onCreate} />
      </AppShell>
    </ErrorBoundary>
  )
}
