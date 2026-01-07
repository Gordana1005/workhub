'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Play, Pause, Square, Clock, Calendar, TrendingUp, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Task {
  id: string
  title: string
  project?: { name: string }
}

interface TimeEntry {
  id: string
  task_id: string | null
  project_id: string | null
  description: string
  duration: number
  date: string
  task?: { title: string; project?: { name: string } }
}

export default function TimeTrackerPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [isTracking, setIsTracking] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [weekStats, setWeekStats] = useState<{day: string, hours: number}[]>([])

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadTimeEntries()
    }
  }, [currentWorkspace])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTracking) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking])

  const loadTasks = async () => {
    if (!currentWorkspace) return

    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()
      
      if (Array.isArray(data)) {
        const formattedData = data
          .filter((task: any) => !task.is_completed)
          .map((task: any) => ({
            id: task.id,
            title: task.title,
            project: task.projects ? { name: task.projects.name } : undefined
          }))
        setTasks(formattedData)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadTimeEntries = async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/time-entries?workspace_id=${currentWorkspace.id}&date=${today}`)
      const data = await res.json()
      
      if (data.timeEntries) {
        setTimeEntries(data.timeEntries)
      }

      // Calculate weekly stats
      await loadWeeklyStats()
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklyStats = async () => {
    if (!currentWorkspace) return

    try {
      // Get last 7 days
      const days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push(date.toISOString().split('T')[0])
      }

      const startDate = days[0]
      const endDate = days[days.length - 1]

      const res = await fetch(`/api/time-entries?workspace_id=${currentWorkspace.id}&start_date=${startDate}&end_date=${endDate}`)
      const data = await res.json()

      // Calculate hours per day
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const stats = days.map((date, index) => {
        const dayEntries = data.timeEntries?.filter((entry: any) => entry.date === date) || []
        const totalHours = dayEntries.reduce((sum: number, entry: any) => sum + (entry.duration / 3600), 0)
        return {
          day: dayNames[new Date(date).getDay()],
          hours: Math.round(totalHours * 10) / 10 // Round to 1 decimal place
        }
      })

      setWeekStats(stats)
    } catch (error) {
      console.error('Error loading weekly stats:', error)
      // Set default empty stats
      setWeekStats([
        { day: 'Mon', hours: 0 },
        { day: 'Tue', hours: 0 },
        { day: 'Wed', hours: 0 },
        { day: 'Thu', hours: 0 },
        { day: 'Fri', hours: 0 },
        { day: 'Sat', hours: 0 },
        { day: 'Sun', hours: 0 }
      ])
    }
  }

  const handleStart = () => {
    setIsTracking(true)
    setStartTime(new Date())
  }

  const handleStop = async () => {
    if (!currentWorkspace || !startTime) return

    try {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          task_id: currentTaskId || null,
          project_id: null,
          duration,
          description: currentDescription || 'Time tracking',
          date: new Date().toISOString().split('T')[0]
        })
      })

      setIsTracking(false)
      setSeconds(0)
      setCurrentTaskId('')
      setCurrentDescription('')
      setStartTime(null)
      loadTimeEntries()
    } catch (error) {
      console.error('Error saving time entry:', error)
      alert('Failed to save time entry')
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const totalToday = timeEntries.reduce((sum, entry) => sum + entry.duration, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Time Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Track your time and boost productivity</p>
        </div>

        {/* Main Timer Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-8 shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="inline-block">
              <div className="text-7xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 font-mono tracking-tight">
                {formatTime(seconds)}
              </div>
              <div className="h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full" />
            </div>
          </div>

          <div className="mb-6">
            <select
              value={currentTaskId}
              onChange={(e) => setCurrentTaskId(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg mb-3"
            >
              <option value="">Select a task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} {task.project ? `(${task.project.name})` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or describe what you're working on..."
              value={currentDescription}
              onChange={(e) => setCurrentDescription(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
            />
          </div>

          <div className="flex gap-4 justify-center">
            {!isTracking ? (
              <Button
                onClick={handleStart}
                disabled={!currentTaskId && !currentDescription.trim()}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-12 py-6 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-6 h-6 mr-3" />
                Start Timer
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsTracking(false)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-12 py-6 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-amber-500/50 transition-all transform hover:scale-105"
                >
                  <Pause className="w-6 h-6 mr-3" />
                  Pause
                </Button>
                <Button
                  onClick={handleStop}
                  className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-12 py-6 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-red-500/50 transition-all transform hover:scale-105"
                >
                  <Square className="w-6 h-6 mr-3" />
                  Stop & Save
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Entries */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Clock className="w-6 h-6 mr-2 text-purple-600" />
                Today's Entries
              </h2>
              <Button variant="secondary" className="rounded-xl">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading entries...</p>
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No time entries for today</p>
                </div>
              ) : (
                timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 hover:shadow-lg transition-all cursor-pointer border border-purple-100 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {entry.task?.title || entry.description}
                      </h3>
                      <span className="text-lg font-bold text-purple-600">{formatDuration(entry.duration)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {entry.task?.project?.name && <span className="mr-4">{entry.task.project.name}</span>}
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                        {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Total Today</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {formatDuration(totalToday)}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                This Week
              </h2>
              <Button variant="secondary" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Bar Chart */}
            <div className="space-y-4">
              {weekStats.map((day) => (
                <div key={day.day} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{day.day}</span>
                    <span className="font-bold text-indigo-600">{day.hours}h</span>
                  </div>
                  <div className="relative h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${(day.hours / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">
                    {weekStats.reduce((acc, day) => acc + day.hours, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {(weekStats.reduce((acc, day) => acc + day.hours, 0) / weekStats.filter(d => d.hours > 0).length).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg/Day</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
