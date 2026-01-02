'use client'

import { useState } from 'react'
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
        <h4 className="text-sm font-medium text-gray-300">
          Subtasks ({completedCount}/{totalCount})
        </h4>
        {totalCount > 0 && (
          <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-blue-purple transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-light transition-colors"
          >
            <button
              onClick={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
              className="flex-shrink-0"
            >
              {subtask.is_completed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Circle className="w-5 h-5 text-gray-500 hover:text-purple-400 transition-colors" />
              )}
            </button>

            <span
              className={`flex-1 text-sm ${
                subtask.is_completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-200'
              }`}
            >
              {subtask.title}
            </span>

            {subtask.estimated_minutes && (
              <span className="text-xs text-gray-500">
                {subtask.estimated_minutes}m
              </span>
            )}

            <button
              onClick={() => handleDeleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
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
          placeholder="Add a subtask..."
          className="flex-1 input-field text-sm"
          disabled={isAdding}
        />
        <button
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
