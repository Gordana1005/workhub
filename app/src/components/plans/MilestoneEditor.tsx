'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Link as LinkIcon, Plus, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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

export default function MilestoneEditor({ planId, milestone, onClose, onSave }: MilestoneEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description || '');
      setTargetDate(milestone.target_date);
      loadLinkedTasks();
    }
    loadAvailableTasks();
  }, [milestone]);

  const loadLinkedTasks = async () => {
    if (!milestone) return;

    const { data } = await supabase
      .from('milestone_tasks')
      .select(`
        tasks!inner(id, title, is_completed)
      `)
      .eq('milestone_id', milestone.id);

    if (data) {
      const tasks = data
        .map((item: any) => item.tasks)
        .filter((t: any): t is Task => t !== null && t !== undefined);
      setLinkedTasks(tasks);
    }
  };

  const loadAvailableTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, is_completed')
      .limit(50);

    if (data) {
      setAvailableTasks(data);
    }
  };

  const handleSave = async () => {
    if (!name || !targetDate) return;

    setSaving(true);

    if (milestone) {
      // Update existing milestone
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
      // Create new milestone
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
    task => !linkedTasks.some(linked => linked.id === task.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">
            {milestone ? 'Edit Milestone' : 'Create Milestone'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Milestone Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Launch beta version"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe this milestone..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Date *
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Linked Tasks */}
          {milestone && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Linked Tasks ({linkedTasks.length})
                </label>
                <button
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sm text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Link Task
                </button>
              </div>

              {showTaskSelector && (
                <div className="mb-4 p-4 bg-slate-800 border border-slate-700 rounded-xl max-h-64 overflow-y-auto">
                  <div className="text-sm text-slate-400 mb-3">Select tasks to link:</div>
                  {unlinkedTasks.length === 0 ? (
                    <p className="text-sm text-slate-500">No available tasks</p>
                  ) : (
                    <div className="space-y-2">
                      {unlinkedTasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => linkTask(task.id)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors text-left"
                        >
                          <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white">{task.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {linkedTasks.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No tasks linked yet
                  </p>
                ) : (
                  linkedTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg group"
                    >
                      <div className={`w-2 h-2 rounded-full ${task.is_completed ? 'bg-green-500' : 'bg-slate-600'}`} />
                      <span className="flex-1 text-sm text-white">{task.title}</span>
                      <button
                        onClick={() => unlinkTask(task.id)}
                        className="p-1.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {milestone && linkedTasks.length > 0 && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="text-sm text-blue-400 mb-2">
                    Progress is automatically calculated from linked tasks
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${milestone.completion_percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white">
                      {milestone.completion_percentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !targetDate || saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : milestone ? 'Save Changes' : 'Create Milestone'}
          </button>
        </div>
      </div>
    </div>
  );
}
