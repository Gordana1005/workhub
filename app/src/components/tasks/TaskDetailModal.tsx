'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import DetailSheet from './DetailSheet'
import { getWorkspaceMembers, fetchProjects, normalizeTask } from './taskUtils'
import type { MemberOption, ProjectOption, Task } from './types'

// The editor is only needed once a task is opened
const TaskDetailPanel = dynamic(() => import('./TaskDetailPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton />,
})

function PanelSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-6" aria-busy="true">
      <div className="skeleton h-9 w-40" />
      <div className="skeleton h-8 w-3/4" />
      <div className="skeleton h-20 w-full" />
      <div className="skeleton h-10 w-full" />
    </div>
  )
}

interface TaskDetailModalProps {
  task: any
  workspaceId: string
  projects?: ProjectOption[]
  teamMembers?: MemberOption[]
  onClose: () => void
  onSave?: () => void
  onUpdate?: (task: any) => void
  onDelete?: (taskId: string) => void
}

/**
 * Stand-alone task editor (used outside the Tasks screen, e.g. from Home). It is the same
 * detail panel the Tasks screen shows inline, wrapped in a modal sheet.
 */
export default function TaskDetailModal({
  task,
  workspaceId,
  projects: externalProjects,
  teamMembers: externalMembers,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const t = useTranslations('pages.tasks')
  const currentUserId = useCurrentUserId()
  const [current, setCurrent] = useState<Task>(() => normalizeTask(task))
  const [projects, setProjects] = useState<ProjectOption[]>(externalProjects || [])
  const [members, setMembers] = useState<MemberOption[]>(externalMembers || [])

  useEffect(() => {
    if (!workspaceId) return
    if (!externalProjects?.length) fetchProjects(workspaceId).then(setProjects).catch(() => {})
    getWorkspaceMembers(workspaceId, t('unknownUser')).then(setMembers).catch(() => {})
  }, [workspaceId, externalProjects, t])

  const handleChange = useCallback(
    (next: Task) => {
      setCurrent(next)
      onUpdate?.(next)
      onSave?.()
    },
    [onUpdate, onSave]
  )

  return (
    <DetailSheet label={t('editTask')} variant="wide" onClose={onClose}>
      <TaskDetailPanel
        task={current}
        workspaceId={workspaceId}
        projects={projects}
        members={members}
        currentUserId={currentUserId}
        onChange={handleChange}
        onDelete={(id) => {
          onDelete?.(id)
          onClose()
        }}
        onClose={onClose}
      />
    </DetailSheet>
  )
}
