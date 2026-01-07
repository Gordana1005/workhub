'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import {
  Play,
  Pause,
  Square,
  Coffee,
  Zap,
  X,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  estimated_hours: number | null
}

type SessionType = 'work' | 'break' | 'longBreak'

export default function FocusMode() {
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()

  // Timer state
  const [time, setTime] = useState(25 * 60) // 25 minutes default
  const [isRunning, setIsRunning] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState(0)

  // Settings
  const [workDuration, setWorkDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Task state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showTaskSelector, setShowTaskSelector] = useState(false)

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        setTasks(data.filter((t: any) => !t.is_completed).slice(0, 20))
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [currentWorkspace])

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false)
    
    if (soundEnabled) {
      // Browser notification sound
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus session complete!', {
          body: sessionType === 'work' ? 'Time for a break!' : 'Ready for another session?',
        })
      }
    }

    if (sessionType === 'work') {
      setSessionsCompleted(prev => {
        const newCount = prev + 1
        // After 4 work sessions, take a long break
        if (newCount % 4 === 0) {
          setSessionType('longBreak')
          setTime(longBreakDuration * 60)
        } else {
          setSessionType('break')
          setTime(breakDuration * 60)
        }
        return newCount
      })
    } else {
      setSessionType('work')
      setTime(workDuration * 60)
    }
  }, [soundEnabled, sessionType, breakDuration, longBreakDuration, workDuration])

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
    }
  }, [currentWorkspace, loadTasks])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            handleSessionComplete()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, time, handleSessionComplete])

  const startSession = (type: SessionType) => {
    setSessionType(type)
    let duration: number
    
    switch (type) {
      case 'work':
        duration = workDuration * 60
        break
      case 'break':
        duration = breakDuration * 60
        break
      case 'longBreak':
        duration = longBreakDuration * 60
        break
    }
    
    setTime(duration)
    setIsRunning(false)
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    startSession(sessionType)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const getProgress = () => {
    let totalDuration: number
    switch (sessionType) {
      case 'work':
        totalDuration = workDuration * 60
        break
      case 'break':
        totalDuration = breakDuration * 60
        break
      case 'longBreak':
        totalDuration = longBreakDuration * 60
        break
    }
    return ((totalDuration - time) / totalDuration) * 100
  }

  const getSessionColor = () => {
    switch (sessionType) {
      case 'work':
        return 'from-purple-500 to-blue-600'
      case 'break':
        return 'from-green-500 to-emerald-600'
      case 'longBreak':
        return 'from-orange-500 to-amber-600'
    }
  }

  const getSessionLabel = () => {
    switch (sessionType) {
      case 'work':
        return 'Focus Time'
      case 'break':
        return 'Short Break'
      case 'longBreak':
        return 'Long Break'
    }
  }

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-radial flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-secondary flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Exit Focus Mode
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-secondary w-10 h-10 flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Session Type Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => startSession('work')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'work'
                ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-glow'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Work
          </button>
          <button
            onClick={() => startSession('break')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'break'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-glow-green'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4 inline mr-2" />
            Break
          </button>
          <button
            onClick={() => startSession('longBreak')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'longBreak'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4 inline mr-2" />
            Long Break
          </button>
        </div>

        {/* Timer Display */}
        <div className="relative mb-12">
          {/* Progress Ring */}
          <svg className="w-80 h-80 md:w-96 md:h-96 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * (0.45 * (typeof window !== 'undefined' ? window.innerWidth > 768 ? 192 : 160 : 160))}`}
              strokeDashoffset={`${2 * Math.PI * (0.45 * (typeof window !== 'undefined' ? window.innerWidth > 768 ? 192 : 160 : 160)) * (1 - getProgress() / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${sessionType === 'work' ? 'stop-color-purple-500' : sessionType === 'break' ? 'stop-color-green-500' : 'stop-color-orange-500'}`} />
                <stop offset="100%" className={`${sessionType === 'work' ? 'stop-color-blue-600' : sessionType === 'break' ? 'stop-color-emerald-600' : 'stop-color-amber-600'}`} />
              </linearGradient>
            </defs>
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-7xl md:text-8xl font-bold font-mono gradient-text mb-4">
              {formatTime(time)}
            </div>
            <div className="text-xl md:text-2xl text-gray-400 font-medium">
              {getSessionLabel()}
            </div>
          </div>
        </div>

        {/* Current Task */}
        {selectedTask ? (
          <div className="card p-6 max-w-2xl w-full mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">Working on:</div>
                <h3 className="text-xl font-semibold mb-2">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-gray-400 text-sm">{selectedTask.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowTaskSelector(true)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowTaskSelector(true)}
            className="card p-6 max-w-2xl w-full mb-8 hover:border-purple-500/50 transition-colors"
          >
            <div className="text-center text-gray-400">
              Select a task to focus on
            </div>
          </button>
        )}

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={toggleTimer}
            className={`px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all shadow-xl hover:scale-105 ${
              isRunning
                ? 'bg-gradient-to-r from-orange-500 to-red-600'
                : `bg-gradient-to-r ${getSessionColor()}`
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-6 h-6" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start
              </>
            )}
          </button>
          <button
            onClick={resetTimer}
            className="btn-secondary px-8 py-4"
          >
            <Square className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions Counter */}
        <div className="mt-8 text-gray-400">
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < sessionsCompleted % 4
                    ? 'bg-gradient-blue-purple'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-center mt-2">
            {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-2xl font-bold mb-6">Pomodoro Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="input-field w-full"
                  min="1"
                  max="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="input-field w-full"
                  min="1"
                  max="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                  className="input-field w-full"
                  min="1"
                  max="60"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="btn-primary flex-1"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Selector Modal */}
      {showTaskSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Select Task</h3>
              <button
                onClick={() => setShowTaskSelector(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No tasks available
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task)
                        setShowTaskSelector(false)
                      }}
                      className="card p-4 w-full text-left card-hover"
                    >
                      <h4 className="font-semibold mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
