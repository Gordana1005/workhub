'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher'
import { Plus, Users, TrendingUp, Clock, CheckCircle, Target, Zap, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const { workspaces, currentWorkspace, fetchWorkspaces, loading } = useWorkspaceStore()
  const [greeting, setGreeting] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    timeLogged: 0,
    activeTasks: 0,
    completionRate: 0
  })

  useEffect(() => {
    const loadData = async () => {
      if (!hasFetched) {
        await fetchWorkspaces();
        setHasFetched(true);
      }

      // Fetch dashboard stats from API
      const fetchStats = async () => {
        try {
          const res = await fetch('/api/dashboard');
          if (!res.ok) throw new Error('Failed to fetch stats');
          const data = await res.json();
          setStats(data);
        } catch (err) {
          // Optionally handle error
          setStats({ tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 });
        }
      };
      await fetchStats();
    };

    loadData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, [fetchWorkspaces, hasFetched]);

  // If user has workspaces but none selected, show workspace selection
  if (workspaces.length > 0 && !currentWorkspace) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Select a Workspace
            </h1>
            <p className="text-xl text-gray-400">
              Choose a workspace to start managing your projects and tasks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => router.push(`/dashboard/workspace/${workspace.id}`)}
                className="group bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-blue-500 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>
                  {workspace.userRole === 'admin' && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {workspace.name}
                </h3>
                <div className="flex items-center text-gray-400">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{workspace.memberCount || 0} members</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If user has no workspaces, show onboarding
  if (workspaces.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Plus className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to ProductivityHub!
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Get started by creating your first workspace to organize your projects and tasks
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-10 rounded-2xl mb-12">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center">
                <Target className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Create Your First Workspace</h2>
            <p className="text-gray-400 mb-8 text-lg">
              Workspaces help you organize projects, invite team members, and track progress
            </p>
            <WorkspaceSwitcher />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track Progress</h3>
              <p className="text-gray-400">
                Monitor project progress with visual dashboards and time tracking
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Team Collaboration</h3>
              <p className="text-gray-400">
                Invite team members and work together on projects
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Generate Reports</h3>
              <p className="text-gray-400">
                Export detailed reports and analytics for your projects
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default dashboard (when workspace is selected or loading)
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {greeting}!
              </h1>
              <p className="text-xl text-gray-400">
                Here's what's happening with your projects today
              </p>
            </div>
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.tasksCompleted}</span>
            </div>
            <h3 className="text-gray-400 font-medium">Tasks Completed</h3>
            <p className="text-sm text-green-400 mt-2">+0% from last week</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-purple-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.timeLogged}h</span>
            </div>
            <h3 className="text-gray-400 font-medium">Time Logged</h3>
            <p className="text-sm text-blue-400 mt-2">This week</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-orange-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.activeTasks}</span>
            </div>
            <h3 className="text-gray-400 font-medium">Active Tasks</h3>
            <p className="text-sm text-orange-400 mt-2">In progress</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-green-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.completionRate}%</span>
            </div>
            <h3 className="text-gray-400 font-medium">Completion Rate</h3>
            <p className="text-sm text-gray-500 mt-2">Overall</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-blue-500 transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 text-blue-500" />
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">View All Tasks</h3>
            <p className="text-gray-400">Manage and track your tasks</p>
          </button>

          <button
            onClick={() => router.push('/dashboard/projects')}
            className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-purple-500 transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <Target className="w-8 h-8 text-purple-500" />
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">View Projects</h3>
            <p className="text-gray-400">Manage your active projects</p>
          </button>

          <button
            onClick={() => router.push('/dashboard/time-tracker')}
            className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-green-500 transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-green-500" />
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Time Tracker</h3>
            <p className="text-gray-400">Log and track your time</p>
          </button>
        </div>

        {/* Empty State Message */}
        <div className="bg-slate-800 border border-slate-700 p-12 rounded-xl text-center">
          <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Ready to get started?</h3>
          <p className="text-gray-400 mb-6">Create your first project and start tracking your work</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
