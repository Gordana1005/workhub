'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, CheckCircle, Circle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Subtask {
  id: string
  title: string
  is_completed: boolean
  position: number
  estimated_minutes?: number
}

interface SubtaskListProps {
  taskId: string
  subtasks: Subtask[]
  onUpdate: () => void
}

export default function SubtaskList({ taskId, subtasks, onUpdate }: SubtaskListProps) {
  const t = useTranslations('pages.tasks')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from('subtasks')
        .insert({
          task_id: taskId,
          title: newSubtaskTitle,
          position: subtasks.length,
        })

      if (!error) {
        setNewSubtaskTitle('')
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to add subtask:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: !currentStatus })
        .eq('id', subtaskId)

      if (!error) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to toggle subtask:', error)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)

      if (!error) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  const completedCount = subtasks.filter(s => s.is_completed).length
  const totalCount = subtasks.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="min-w-0 text-sm font-medium text-text-secondary">
          {t('subtasksProgress', { completed: completedCount, total: totalCount })}
        </h4>
        {totalCount > 0 && (
          <div className="w-24 shrink-0 sm:w-32 h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors"
          >
            <button
              type="button"
              aria-label={t('markComplete')}
              onClick={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
              className="flex-shrink-0"
            >
              {subtask.is_completed ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-text-secondary hover:text-primary transition-colors" />
              )}
            </button>

            <span
              className={`min-w-0 flex-1 break-words text-sm ${
                subtask.is_completed
                  ? 'line-through text-text-secondary'
                  : 'text-text-primary'
              }`}
            >
              {subtask.title}
            </span>

            {subtask.estimated_minutes && (
              <span className="text-xs text-text-secondary">
                {t('minutesShort', { count: subtask.estimated_minutes })}
              </span>
            )}

            <button
              type="button"
              aria-label={t('delete')}
              onClick={() => handleDeleteSubtask(subtask.id)}
              className="shrink-0 text-danger transition-opacity hover:opacity-80 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
          placeholder={t('addSubtask')}
          className="min-w-0 flex-1 input-field text-sm"
          disabled={isAdding}
        />
        <button
          type="button"
          aria-label={t('addSubtask')}
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim() || isAdding}
          className="btn-secondary px-3"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
