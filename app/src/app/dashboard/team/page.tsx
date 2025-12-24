'use client'

import { useState } from 'react'
import { Users, Mail, UserPlus, Shield, Crown, Search, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data
  const teamMembers = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@admin.com',
      role: 'admin',
      avatar: null,
      joinedDate: '2025-01-01',
      tasksCompleted: 45,
      hoursLogged: 120,
      status: 'active'
    },
    {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'member',
      avatar: null,
      joinedDate: '2025-01-15',
      tasksCompleted: 32,
      hoursLogged: 98,
      status: 'active'
    },
    {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'member',
      avatar: null,
      joinedDate: '2025-01-10',
      tasksCompleted: 28,
      hoursLogged: 85,
      status: 'active'
    }
  ]

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-cyan-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your workspace team</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Members</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {teamMembers.length}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Admins</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {teamMembers.filter(m => m.role === 'admin').length}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Active Now</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {teamMembers.filter(m => m.status === 'active').length}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">
            <UserPlus className="w-5 h-5 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:scale-105"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getRoleColor(member.role)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                  {getInitials(member.name)}
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Mail className="w-4 h-4 mr-1" />
                  {member.email}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getRoleColor(member.role)}`}>
                  {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{member.tasksCompleted}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Tasks</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{member.hoursLogged}h</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Hours</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Joined {new Date(member.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Active
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Invite Card */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-3xl font-bold mb-2">Grow Your Team</h2>
              <p className="text-purple-100">Invite team members to collaborate on projects</p>
            </div>
            <Button className="bg-white text-purple-600 px-8 py-4 rounded-xl hover:shadow-2xl transition-all font-semibold">
              <Mail className="w-5 h-5 mr-2" />
              Send Invitations
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
