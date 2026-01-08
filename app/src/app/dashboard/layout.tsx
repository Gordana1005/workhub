'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { fetchWorkspaces, workspaces } = useWorkspaceStore()

  useEffect(() => {
    // Determine if we need to fetch. 
    // fetchWorkspaces inside the store likely handles checking if authenticated, etc.
    // If workspaces are empty, let's fetch.
    if (workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [fetchWorkspaces, workspaces.length])

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col lg:ml-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}