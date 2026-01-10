'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Timer,
  CheckSquare,
  FileText,
  Zap,
  Webhook,
  Target,
  DollarSign,
  Building2,
  CreditCard
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Workspaces', href: '/dashboard/workspaces', icon: Building2 },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Plans', href: '/dashboard/plans', icon: Target },
  { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { name: 'Notes', href: '/dashboard/notes', icon: FileText },
  { name: 'Time Tracker', href: '/dashboard/time-tracker', icon: Timer },
  { name: 'Focus Mode', href: '/dashboard/focus', icon: Zap },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Webhook },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 h-screen bg-secondary border-r border-border transform transition-transform duration-300 ease-in-out lg:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-white/5">
              <span className="text-xl font-bold text-white tracking-tight">TrackWork<span className="text-primary">.</span></span>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={twMerge(clsx(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm font-medium',
                    isActive
                        ? 'bg-primary/10 text-primary'  // Deel Active State
                        : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                    ))}
                >
                    <item.icon className={clsx(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-primary' : 'text-text-secondary group-hover:text-white'
                    )} />
                    <span>{item.name}</span>
                </Link>
                )
            })}
            </nav>
            
            {/* Bottom Section (Profile/Logout could go here) */}
             <div className="p-4 border-t border-white/5">
                <div className="flex items-center space-x-3 text-text-muted text-xs">
                    <span>v2.0 Dark</span>
                </div>
            </div>
        </div>
      </aside>
    </>
  )
}
