'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, Target, TrendingUp, MoreVertical, Edit, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  description: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  color: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  name: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentWorkspace } = useWorkspaceStore();
  const router = useRouter();

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadPlans();
    }
  }, [currentWorkspace?.id]);

  const loadPlans = async () => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select(`
        *,
        milestones:plan_milestones(*)
      `)
      .eq('workspace_id', currentWorkspace.id)
      .order('start_date', { ascending: false });

    if (data) setPlans(data);
    setLoading(false);
  };

  const getOverallProgress = (plan: Plan) => {
    if (!plan.milestones || plan.milestones.length === 0) return 0;
    
    const totalPercentage = plan.milestones.reduce(
      (sum, m) => sum + m.completion_percentage,
      0
    );
    return Math.round(totalPercentage / plan.milestones.length);
  };

  const getDaysRemaining = (plan: Plan) => {
    const days = differenceInDays(new Date(plan.end_date), new Date());
    return days > 0 ? days : 0;
  };

  const getStatusColor = (status: Plan['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Plans</h1>
          <p className="text-slate-400">Strategic roadmaps and quarterly goals</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Plan
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Active Plans"
          value={plans.filter(p => p.status === 'active').length}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={plans.filter(p => p.status === 'completed').length}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Total Milestones"
          value={plans.reduce((sum, p) => sum + (p.milestones?.length || 0), 0)}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          label="Avg Progress"
          value={plans.length > 0 ? `${Math.round(plans.reduce((sum, p) => sum + getOverallProgress(p), 0) / plans.length)}%` : '0%'}
          icon={<TrendingUp className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/2 mb-4" />
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No plans yet</h3>
          <p className="text-slate-400 mb-6">Create your first strategic plan to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors cursor-pointer group"
              onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: plan.color }}
                  />
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                </div>
                
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}
                >
                  {plan.status}
                </span>
              </div>

              {plan.description && (
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{plan.description}</p>
              )}

              {plan.goal && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">{plan.goal}</p>
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(plan.start_date), 'MMM d')} - {format(new Date(plan.end_date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  {getDaysRemaining(plan)} days left
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Overall Progress</span>
                  <span className="text-white font-medium">{getOverallProgress(plan)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${getOverallProgress(plan)}%` }}
                  />
                </div>
              </div>

              {/* Milestones Summary */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  {plan.milestones?.length || 0} milestones
                </span>
                <span className="text-slate-400">
                  {plan.milestones?.filter(m => m.is_completed).length || 0} completed
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadPlans();
          }}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}

interface CreatePlanModalProps {
  onClose: () => void;
  onSave: () => void;
}

function CreatePlanModal({ onClose, onSave }: CreatePlanModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [status, setStatus] = useState<Plan['status']>('draft');
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  const handleSave = async () => {
    if (!name || !startDate || !endDate || !currentWorkspace?.id) return;

    setSaving(true);
    const { error } = await supabase.from('plans').insert({
      workspace_id: currentWorkspace.id,
      name,
      description,
      goal,
      start_date: startDate,
      end_date: endDate,
      color,
      status,
    });

    if (!error) {
      onSave();
    }
    setSaving(false);
  };

  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#f43f5e', '#6366f1'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Plan</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Plan Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Q1 2026 Roadmap"
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
              placeholder="What's this plan about?"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Strategic Goal
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Launch MVP and reach 100 users"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Plan['status'])}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Color
            </label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !startDate || !endDate || saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
