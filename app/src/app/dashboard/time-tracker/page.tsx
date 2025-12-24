'use client'

import { useState } from 'react'
import { Play, Pause, Square, Clock, Calendar, TrendingUp, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function TimeTrackerPage() {
  const [isTracking, setIsTracking] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [currentTask, setCurrentTask] = useState('')

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Mock data
  const todayEntries = [
    { task: 'Website Design', project: 'Client Website', duration: 7200, startTime: '09:00 AM' },
    { task: 'Code Review', project: 'Mobile App', duration: 3600, startTime: '11:30 AM' },
    { task: 'Team Meeting', project: 'Internal', duration: 1800, startTime: '02:00 PM' }
  ]

  const weekStats = [
    { day: 'Mon', hours: 7.5 },
    { day: 'Tue', hours: 8.2 },
    { day: 'Wed', hours: 6.8 },
    { day: 'Thu', hours: 7.9 },
    { day: 'Fri', hours: 5.5 },
    { day: 'Sat', hours: 0 },
    { day: 'Sun', hours: 0 }
  ]

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
            <input
              type="text"
              placeholder="What are you working on?"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
            />
          </div>

          <div className="flex gap-4 justify-center">
            {!isTracking ? (
              <Button
                onClick={() => setIsTracking(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-12 py-6 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-105"
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
                  onClick={() => {
                    setIsTracking(false)
                    setSeconds(0)
                    setCurrentTask('')
                  }}
                  className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-12 py-6 rounded-2xl text-xl font-semibold hover:shadow-2xl hover:shadow-red-500/50 transition-all transform hover:scale-105"
                >
                  <Square className="w-6 h-6 mr-3" />
                  Stop
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
              {todayEntries.map((entry, index) => (
                <div
                  key={index}
                  className="group p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 hover:shadow-lg transition-all cursor-pointer border border-purple-100 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{entry.task}</h3>
                    <span className="text-lg font-bold text-purple-600">{formatTime(entry.duration)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="mr-4">{entry.project}</span>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                      {entry.startTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Total Today</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {formatTime(todayEntries.reduce((acc, entry) => acc + entry.duration, 0))}
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
