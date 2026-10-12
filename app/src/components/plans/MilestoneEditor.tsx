'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { runTopLevel } from '@/lib/subtasks';
import { useTranslations } from 'next-intl';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
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
  onDelete?: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-11 min-w-0 sm:min-h-10 sm:text-sm';

export default function MilestoneEditor({ planId, milestone, onClose, onSave, onDelete }: MilestoneEditorProps) {
  const t = useTranslations('pages.plans');
  const { currentWorkspace } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [search, setSearch] = useState('');
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

  const workspaceId = currentWorkspace?.id;

  const loadAvailableTasks = useCallback(async () => {
    // top-level tasks only (subtasks are not linked to milestones)
    const { data } = await runTopLevel((topLevel) => {
      let query = supabase
        .from('tasks')
        .select('id, title, is_completed')
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(200);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      if (topLevel) query = query.is('parent_task_id', null);
      return query;
    });

    if (data) {
      setAvailableTasks(data);
    }
  }, [workspaceId]);

  useEffect(() => {
    setShowTaskSelector(false);
    setSearch('');
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
    if (!name.trim() || !targetDate) return;

    setSaving(true);

    if (milestone) {
      const { error } = await supabase
        .from('plan_milestones')
        .update({
          name: name.trim(),
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
          name: name.trim(),
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

  const unlinkedTasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return availableTasks.filter(
      (task) =>
        !linkedTasks.some((linked) => linked.id === task.id) &&
        (needle === '' || task.title.toLowerCase().includes(needle))
    );
  }, [availableTasks, linkedTasks, search]);

  const doneCount = linkedTasks.filter((task) => task.is_completed).length;
  const progress =
    linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : milestone?.completion_percentage ?? 0;

  return (
    <Dialog
      open
      title={milestone ? t('editMilestoneTitle') : t('createMilestoneTitle')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {milestone && onDelete ? (
            <Button type="button" variant="danger" className="h-11 sm:mr-auto sm:h-10" onClick={onDelete}>
              {t('deleteMilestone')}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="milestone-form"
            className="h-12 sm:h-10"
            disabled={!name.trim() || !targetDate || saving}
          >
            {saving ? t('saving') : milestone ? t('saveChanges') : t('createMilestone')}
          </Button>
        </>
      }
    >
      <form
        id="milestone-form"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block text-sm text-text-secondary">
            {t('milestoneName')}
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('milestoneNamePlaceholder')}
              enterKeyHint="next"
              autoFocus
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
        </div>

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

        {milestone ? (
          <div className="border-t border-border pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-primary">
                {t('linkedTasks', { count: linkedTasks.length })}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-expanded={showTaskSelector}
                onClick={() => setShowTaskSelector((open) => !open)}
                className="h-11 gap-1.5 sm:h-8"
              >
                {showTaskSelector ? <X className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                {showTaskSelector ? t('doneLinking') : t('linkTask')}
              </Button>
            </div>

            {showTaskSelector ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-border">
                <div className="relative border-b border-border">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('searchTasks')}
                    aria-label={t('searchTasks')}
                    className="min-h-11 w-full bg-transparent py-2.5 pl-9 pr-3 text-base text-text-primary sm:min-h-10 sm:text-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  />
                </div>
                <div className="max-h-[40dvh] overflow-y-auto overscroll-contain sm:max-h-56">
                  {unlinkedTasks.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-text-secondary">{t('noAvailableTasks')}</p>
                  ) : (
                    <ul>
                      {unlinkedTasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => linkTask(task.id)}
                            className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none active:bg-tertiary"
                          >
                            <Plus className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                            <span
                              className={`min-w-0 flex-1 truncate text-sm ${
                                task.is_completed ? 'text-text-muted line-through' : 'text-text-primary'
                              }`}
                            >
                              {task.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {linkedTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-text-secondary">
                {t('noLinkedTasks')}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {linkedTasks.map((task) => (
                  <li key={task.id} className="flex min-h-11 items-center gap-3 py-1 pl-3 pr-1">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        task.is_completed ? 'border-success bg-success text-white' : 'border-text-muted'
                      }`}
                      aria-hidden
                    >
                      {task.is_completed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        task.is_completed ? 'text-text-muted line-through' : 'text-text-primary'
                      }`}
                    >
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => unlinkTask(task.id)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-tertiary sm:h-9 sm:w-9"
                      aria-label={t('unlinkTask')}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {linkedTasks.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-medium tabular-nums text-text-primary">{progress}%</span>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">{t('progressAuto')}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
