'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, CheckCircle2, Circle, Edit, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import GanttTimeline from '@/components/plans/GanttTimeline';
import MilestoneEditor from '@/components/plans/MilestoneEditor';

interface Plan {
  id: string;
  name: string;
  description: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  color: string;
}

interface Milestone {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  task_count?: number;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) setPlan(data);
    setLoading(false);
  }, [params.id]);

  const loadMilestones = useCallback(async () => {
    const { data } = await supabase
      .from('plan_milestones')
      .select(`
        *,
        task_count:milestone_tasks(count)
      `)
      .eq('plan_id', params.id)
      .order('order_index');

    if (data) {
      setMilestones(data.map(m => ({
        ...m,
        task_count: m.task_count?.[0]?.count || 0
      })));
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadPlan();
      loadMilestones();
    }
  }, [params.id, loadPlan, loadMilestones]);

  const deleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;

    await supabase.from('plan_milestones').delete().eq('id', id);
    loadMilestones();
  };

  const getStatusColor = (status: Plan['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-800 rounded w-1/2 mb-8" />
          <div className="h-64 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-white mb-2">Plan not found</h2>
          <button
            onClick={() => router.push('/dashboard/plans')}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = differenceInDays(new Date(plan.end_date), new Date());
  const overallProgress = milestones.length > 0
    ? Math.round(milestones.reduce((sum, m) => sum + m.completion_percentage, 0) / milestones.length)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/plans')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plans
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: plan.color }}
            />
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{plan.name}</h1>
              {plan.description && (
                <p className="text-slate-400">{plan.description}</p>
              )}
            </div>
          </div>

          <span className={`px-4 py-2 rounded-xl text-sm font-medium border ${getStatusColor(plan.status)}`}>
            {plan.status}
          </span>
        </div>

        {plan.goal && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Calendar className="w-4 h-4" />
              Strategic Goal
            </div>
            <p className="text-white">{plan.goal}</p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Timeline</div>
          <div className="text-white font-semibold">
            {format(new Date(plan.start_date), 'MMM d')} - {format(new Date(plan.end_date), 'MMM d, yyyy')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Days Remaining</div>
          <div className="text-white font-semibold text-2xl">
            {daysRemaining > 0 ? daysRemaining : 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Milestones</div>
          <div className="text-white font-semibold text-2xl">
            {milestones.filter(m => m.is_completed).length}/{milestones.length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Overall Progress</div>
          <div className="text-white font-semibold text-2xl">{overallProgress}%</div>
        </div>
      </div>

      {/* Gantt Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Timeline</h2>
        <GanttTimeline
          plan={plan}
          milestones={milestones}
          onMilestoneClick={(milestone: any) => {
            setEditingMilestone(milestone);
            setShowMilestoneModal(true);
          }}
        />
      </div>

      {/* Milestones List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Milestones</h2>
          <button
            onClick={() => {
              setEditingMilestone(null);
              setShowMilestoneModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No milestones yet</p>
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              Create First Milestone
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
              >
                <div className="flex-shrink-0">
                  {milestone.is_completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{milestone.name}</h3>
                    <span className="text-sm text-slate-400">
                      {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {milestone.description && (
                    <p className="text-sm text-slate-400 mb-2">{milestone.description}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-xs">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${milestone.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">
                      {milestone.completion_percentage}% • {milestone.task_count || 0} tasks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingMilestone(milestone);
                      setShowMilestoneModal(true);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => deleteMilestone(milestone.id)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Trash className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showMilestoneModal && (
        <MilestoneEditor
          planId={plan.id}
          milestone={editingMilestone}
          onClose={() => {
            setShowMilestoneModal(false);
            setEditingMilestone(null);
          }}
          onSave={() => {
            setShowMilestoneModal(false);
            setEditingMilestone(null);
            loadMilestones();
          }}
        />
      )}
    </div>
  );
}
