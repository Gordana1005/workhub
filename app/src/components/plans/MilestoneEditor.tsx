'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link as LinkIcon, Plus, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface Milestone {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
  order_index: number;
}

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
}

interface MilestoneEditorProps {
  planId: string;
  milestone: Milestone | null;
  onClose: () => void;
  onSave: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export default function MilestoneEditor({ planId, milestone, onClose, onSave }: MilestoneEditorProps) {
  const t = useTranslations('pages.plans');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadLinkedTasks = useCallback(async () => {
    if (!milestone) return;

    const { data } = await supabase
      .from('milestone_tasks')
      .select(`
        tasks!inner(id, title, is_completed)
      `)
      .eq('milestone_id', milestone.id);

    if (data) {
      const tasks = data
        .map((item: { tasks: Task | Task[] | null }) => item.tasks)
        .flatMap((task) => (Array.isArray(task) ? task : task ? [task] : []))
        .filter((task): task is Task => task !== null && task !== undefined);
      setLinkedTasks(tasks);
    }
  }, [milestone]);

  const loadAvailableTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, is_completed')
      .limit(50);

    if (data) {
      setAvailableTasks(data);
    }
  }, []);

  useEffect(() => {
    setShowTaskSelector(false);
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description || '');
      setTargetDate(milestone.target_date ? milestone.target_date.slice(0, 10) : '');
      loadLinkedTasks();
    } else {
      setName('');
      setDescription('');
      setTargetDate('');
      setLinkedTasks([]);
    }
    loadAvailableTasks();
  }, [milestone, loadLinkedTasks, loadAvailableTasks]);

  const handleSave = async () => {
    if (!name || !targetDate) return;

    setSaving(true);

    if (milestone) {
      const { error } = await supabase
        .from('plan_milestones')
        .update({
          name,
          description,
          target_date: targetDate,
        })
        .eq('id', milestone.id);

      if (!error) {
        onSave();
      }
    } else {
      const { data, error } = await supabase
        .from('plan_milestones')
        .insert({
          plan_id: planId,
          name,
          description,
          target_date: targetDate,
          order_index: 0,
        })
        .select()
        .single();

      if (!error && data) {
        onSave();
      }
    }

    setSaving(false);
  };

  const linkTask = async (taskId: string) => {
    if (!milestone) return;

    await supabase.from('milestone_tasks').insert({
      milestone_id: milestone.id,
      task_id: taskId,
    });

    loadLinkedTasks();
    setShowTaskSelector(false);
  };

  const unlinkTask = async (taskId: string) => {
    if (!milestone) return;

    await supabase
      .from('milestone_tasks')
      .delete()
      .eq('milestone_id', milestone.id)
      .eq('task_id', taskId);

    loadLinkedTasks();
  };

  const unlinkedTasks = availableTasks.filter(
    (task) => !linkedTasks.some((linked) => linked.id === task.id)
  );

  return (
    <Dialog
      open
      title={milestone ? t('editMilestoneTitle') : t('createMilestoneTitle')}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="milestone-form"
            className="flex-1"
            disabled={!name || !targetDate || saving}
          >
            {saving ? t('saving') : milestone ? t('saveChanges') : t('createMilestone')}
          </Button>
        </div>
      }
    >
      <form
        id="milestone-form"
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <label className="block text-sm text-text-secondary">
          {t('milestoneName')}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('milestoneNamePlaceholder')}
          />
        </label>

        <label className="block text-sm text-text-secondary">
          {t('description')}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('milestoneDescriptionPlaceholder')}
            rows={3}
          />
        </label>

        <label className="block text-sm text-text-secondary">
          {t('targetDate')}
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className={`${fieldClass} mt-1.5`}
          />
        </label>

        {milestone ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-text-secondary">
                {t('linkedTasks', { count: linkedTasks.length })}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowTaskSelector((open) => !open)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('linkTask')}
              </Button>
            </div>

            {showTaskSelector ? (
              <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-border p-4">
                <p className="mb-3 text-sm text-text-secondary">{t('selectTasks')}</p>
                {unlinkedTasks.length === 0 ? (
                  <p className="text-sm text-text-secondary">{t('noAvailableTasks')}</p>
                ) : (
                  <div className="space-y-2">
                    {unlinkedTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => linkTask(task.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:bg-surface-hover"
                      >
                        <LinkIcon className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="min-w-0 truncate text-sm text-text-primary">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="space-y-2">
              {linkedTasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  {t('noLinkedTasks')}
                </p>
              ) : (
                linkedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className={`h-2 w-2 shrink-0 rounded-full ${task.is_completed ? 'bg-primary' : 'bg-border'}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => unlinkTask(task.id)}
                      className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover"
                      aria-label={t('unlinkTask')}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {linkedTasks.length > 0 ? (
              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="mb-2 text-sm text-text-secondary">{t('progressAuto')}</p>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${milestone.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {milestone.completion_percentage}%
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
