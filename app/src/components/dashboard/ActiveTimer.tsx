'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/stores/useTimerStore'
import { Play, Pause, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ActiveTimer() {
  const { time, isRunning, start, stop, reset } = useTimerStore()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        useTimerStore.getState().tick()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-6 right-6 p-4 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark rounded-lg z-50">
      <div className="flex items-center space-x-4">
        <div className="text-2xl font-mono font-bold text-text-primary">
          {formatTime(time)}
        </div>

        <div className="flex space-x-2">
          {!isRunning ? (
            <Button
              onClick={() => start()}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={stop}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              <Pause className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={reset}
            size="sm"
            variant="secondary"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}