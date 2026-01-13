'use client'

import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import Topbar from '@/components/layout/Topbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { fetchWorkspaces, workspaces } = useWorkspaceStore()

  useEffect(() => {
    if (workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [fetchWorkspaces, workspaces.length])

  return (
    <ErrorBoundary>
      <div className="relative flex flex-col min-h-screen bg-bg-primary">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#2d0c5b] via-[#160b2d] to-transparent opacity-90" />
        <Topbar />
        <main className="relative z-10 flex-1 overflow-auto container mx-auto px-4 py-6 max-w-7xl">
            {children}
        </main>
      </div>
    </ErrorBoundary>
  )
}
