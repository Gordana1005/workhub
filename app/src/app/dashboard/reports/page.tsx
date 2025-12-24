'use client'

import { useState } from 'react'
import { Download, TrendingUp, Calendar, BarChart3, PieChart, FileText, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('week')

  // Mock data
  const projectStats = [
    { name: 'Website Redesign', hours: 45, tasks: 24, progress: 65, color: '#667eea' },
    { name: 'Mobile App', hours: 32, tasks: 18, progress: 40, color: '#f093fb' },
    { name: 'Marketing', hours: 28, tasks: 15, progress: 85, color: '#4facfe' }
  ]

  const timeDistribution = [
    { category: 'Development', percentage: 45, color: '#667eea' },
    { category: 'Meetings', percentage: 20, color: '#f093fb' },
    { category: 'Design', percentage: 25, color: '#4facfe' },
    { category: 'Other', percentage: 10, color: '#764ba2' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Track your productivity and performance</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg">
              <Download className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">105h</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <span className="mr-1">↑ 12%</span>
              <span className="text-gray-500">vs last week</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">57</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <span className="mr-1">↑ 8%</span>
              <span className="text-gray-500">vs last week</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">87%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Productivity</p>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <span className="mr-1">↑ 5%</span>
              <span className="text-gray-500">vs last week</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">3</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Projects Active</p>
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <span className="mr-1">→ 0%</span>
              <span>vs last week</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Project Performance</h2>
            <div className="space-y-6">
              {projectStats.map((project) => (
                <div key={project.name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.tasks} tasks • {project.hours}h logged</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: project.color }}>
                        {project.progress}%
                      </div>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.progress}%`,
                        background: `linear-gradient(90deg, ${project.color}, ${project.color}dd)`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Time Distribution</h2>
            <div className="space-y-4">
              {timeDistribution.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{item.category}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{item.percentage}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-7">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart Visualization */}
            <div className="mt-8 flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90" width="192" height="192" viewBox="0 0 192 192">
                  {timeDistribution.reduce((acc, item, index) => {
                    const prevPercentage = timeDistribution.slice(0, index).reduce((sum, i) => sum + i.percentage, 0)
                    const strokeDasharray = `${(item.percentage / 100) * 565} 565`
                    const strokeDashoffset = -((prevPercentage / 100) * 565)
                    
                    return [...acc, (
                      <circle
                        key={item.category}
                        cx="96"
                        cy="96"
                        r="90"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="24"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    )]
                  }, [] as React.ReactElement[])}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">100%</div>
                    <div className="text-sm text-gray-500">Total Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
