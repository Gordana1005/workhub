'use client';

import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import ProductivityCharts from '@/components/reports/ProductivityCharts';
import ExportDialog from '@/components/ExportDialog';
import { Download, TrendingUp, Clock, CheckCircle, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    totalTimeLogged: 0,
    completionRate: 0,
  });
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      loadReportData();
    }
  }, [currentWorkspace]);

  const loadReportData = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      // Fetch all tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (tasks) {
        // Calculate stats
        const completed = tasks.filter(t => t.is_completed).length;
        const active = tasks.filter(t => !t.is_completed).length;
        const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks: completed,
          activeTasks: active,
          totalTimeLogged: 0, // TODO: Calculate from time_entries
          completionRate,
        });

        // Tasks by priority
        const priorityCounts = tasks.reduce((acc: any, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {});

        setPriorityData([
          { name: 'Urgent', value: priorityCounts.urgent || 0 },
          { name: 'High', value: priorityCounts.high || 0 },
          { name: 'Medium', value: priorityCounts.medium || 0 },
          { name: 'Low', value: priorityCounts.low || 0 },
        ]);

        // Tasks by category
        const categoryCounts = tasks.reduce((acc: any, task) => {
          if (task.category) {
            acc[task.category] = (acc[task.category] || 0) + 1;
          }
          return acc;
        }, {});

        setCategoryData(
          Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value,
          }))
        );

        // Tasks completion trend (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const trendData = last7Days.map(date => {
          const completed = tasks.filter(
            t => t.completed_at && t.completed_at.startsWith(date)
          ).length;
          const created = tasks.filter(
            t => t.created_at && t.created_at.startsWith(date)
          ).length;

          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            completed,
            created,
          };
        });

        setTasksData(trendData);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports & Analytics</h1>
          <p className="text-gray-400 mt-2">Track your productivity and team performance</p>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Total Tasks</h3>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold">{stats.totalTasks}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Completed</h3>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold">{stats.completedTasks}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Active</h3>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold">{stats.activeTasks}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Completion Rate</h3>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-3xl font-bold">{stats.completionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <ProductivityCharts
        tasksData={tasksData}
        priorityData={priorityData}
        categoryData={categoryData}
        completionRate={stats.completionRate}
      />

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          data={[]}
          dataType="tasks"
          defaultFilename="workhub-report"
        />
      )}
    </div>
  );
}
