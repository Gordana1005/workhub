import { Menu } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import WorkspaceSwitcher from './WorkspaceSwitcher'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">worktrack</h1>
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center space-x-4">
        <DarkModeToggle />
        {/* TODO: Add user menu/profile dropdown */}
      </div>
    </header>
  )
}