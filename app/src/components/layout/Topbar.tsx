import DarkModeToggle from './DarkModeToggle'
import WorkspaceSwitcher from './WorkspaceSwitcher'

export default function Topbar() {
  return (
    <header className="h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-text-primary">ProductivityHub</h1>
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center space-x-4">
        <DarkModeToggle />
        {/* TODO: Add user menu/profile dropdown */}
      </div>
    </header>
  )
}