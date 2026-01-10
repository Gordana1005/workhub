'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { fetchWorkspaces, workspaces } = useWorkspaceStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [fetchWorkspaces, workspaces.length])

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen bg-bg-primary">
        <Topbar onMenuToggle={() => setIsSidebarOpen(true)} />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 overflow-auto container mx-auto px-4 py-6 max-w-7xl">
            {children}
        </main>
      </div>
    </ErrorBoundary>
  )
}
