'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import DetailSheet from './DetailSheet'
import TaskDetailPanel from './TaskDetailPanel'
import { fetchMembers, fetchProjects, normalizeTask } from './taskUtils'
import type { MemberOption, ProjectOption, Task } from './types'

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
    if (!externalMembers?.length) fetchMembers(workspaceId, t('unknownUser')).then(setMembers).catch(() => {})
  }, [workspaceId, externalProjects, externalMembers, t])

  const handleChange = useCallback(
    (next: Task) => {
      setCurrent(next)
      onUpdate?.(next)
      onSave?.()
    },
    [onUpdate, onSave]
  )

  return (
    <DetailSheet label={t('editTask')} variant="center" onClose={onClose}>
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
