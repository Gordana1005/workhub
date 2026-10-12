'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import AssigneePicker from '@/components/tasks/AssigneePicker'
import { CATEGORY_COLORS } from './projectUtils'

export interface TaskFormValues {
  title: string
  description: string
  priority: string
  due_date: string
  assignee_id: string
  category: string
}

export interface PickerMember {
  id: string
  username: string
  avatar_url?: string | null
}

export interface PickerCategory {
  id: string
  name: string
  color: string
}

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted sm:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

export { CATEGORY_COLORS }

export function CreateTaskDialog({
  open,
  members,
  categories,
  defaultAssigneeId,
  onClose,
  onSubmit,
  onNewCategory,
}: {
  open: boolean
  members: PickerMember[]
  categories: PickerCategory[]
  defaultAssigneeId: string
  onClose: () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
  onNewCategory: () => void
}) {
  const t = useTranslations('pages.projects')
  const empty: TaskFormValues = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_id: defaultAssigneeId,
    category: '',
  }
  const [form, setForm] = useState<TaskFormValues>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({ ...empty, assignee_id: defaultAssigneeId })
    setSaving(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ ...form, title: form.title.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createTaskFailed'))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (!saving) onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('createTaskTitle')}
      onClose={close}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto" onClick={close} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="create-task-form" className="h-11 w-full sm:h-10 sm:w-auto" disabled={saving || !form.title.trim()}>
            {saving ? t('saving') : t('createTask')}
          </Button>
        </div>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <label className="block text-sm font-medium text-text-secondary">
          {t('taskTitle')}
          <input
            type="text"
            required
            autoFocus
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('taskTitlePlaceholder')}
          />
        </label>

        <label className="block text-sm font-medium text-text-secondary">
          {t('description')}
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={`${fieldClass} mt-1.5 resize-y`}
            placeholder={t('taskDescriptionPlaceholder')}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-text-secondary">
            {t('priorityField')}
            <select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="low">{t('priority.low')}</option>
              <option value="medium">{t('priority.medium')}</option>
              <option value="high">{t('priority.high')}</option>
              <option value="urgent">{t('priority.urgent')}</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-text-secondary">
            {t('dueDate')}
            <input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm({ ...form, due_date: event.target.value })}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <div>
            <span className="block text-sm font-medium text-text-secondary">{t('assignee')}</span>
            <div className="mt-1.5">
              <AssigneePicker
                variant="form"
                members={members}
                value={form.assignee_id}
                currentUserId={defaultAssigneeId}
                onChange={(id) => setForm({ ...form, assignee_id: id })}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="create-task-category" className="text-sm font-medium text-text-secondary">
                {t('categoryOptional')}
              </label>
              <button
                type="button"
                onClick={onNewCategory}
                className="inline-flex h-10 items-center rounded px-1 text-sm font-medium text-primary hover:underline active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('newCategory')}
              </button>
            </div>
            <select
              id="create-task-category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="">{t('noCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export function CreateCategoryDialog({
  open,
  initialColor,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialColor: string
  onClose: () => void
  onSubmit: (name: string, color: string) => Promise<void>
}) {
  const t = useTranslations('pages.projects')
  const [name, setName] = useState('')
  const [color, setColor] = useState(initialColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setColor(initialColor)
    setSaving(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(name.trim(), color)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createCategoryFailed'))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (!saving) onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('createCategoryTitle')}
      onClose={close}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto" onClick={close} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="create-category-form" className="w-full sm:w-auto" disabled={saving || !name.trim()}>
            {saving ? t('saving') : t('createCategory')}
          </Button>
        </div>
      }
    >
      <form id="create-category-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <label className="block text-sm font-medium text-text-secondary">
          {t('categoryName')}
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('categoryNamePlaceholder')}
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">{t('color')}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                className={`h-10 w-10 rounded-full border border-border transition-shadow sm:h-8 sm:w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  color === swatch ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface' : ''
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
