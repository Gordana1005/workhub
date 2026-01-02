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
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
            👥 Team Members
          </h1>
          <p className="text-gray-400 text-base md:text-lg">Manage your workspace team</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Members</p>
                <p className="text-4xl font-bold text-white">
                  {teamMembers.length}
                </p>
              </div>
              <div className="stat-icon bg-gradient-blue-purple">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Admins</p>
                <p className="text-4xl font-bold text-white">
                  {teamMembers.filter(m => m.role === 'admin').length}
                </p>
              </div>
              <div className="stat-icon bg-gradient-to-br from-purple-500 to-pink-600">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Now</p>
                <p className="text-4xl font-bold text-white">
                  {teamMembers.filter(m => m.status === 'active').length}
                </p>
              </div>
              <div className="stat-icon bg-gradient-green">
                <Shield className="w-6 h-6 text-white" />
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
              className="input-field w-full pl-12"
            />
          </div>
          <button className="btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="card p-6 card-hover"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-blue-purple flex items-center justify-center text-white text-xl font-bold`}>
                  {getInitials(member.name)}
                </div>
                <button className="p-2 hover:bg-surface-light rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <Mail className="w-4 h-4 mr-1" />
                  {member.email}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  member.role === 'admin' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-surface rounded-xl">
                  <div className="text-2xl font-bold text-blue-400">{member.tasksCompleted}</div>
                  <div className="text-xs text-gray-400">Tasks</div>
                </div>
                <div className="text-center p-3 bg-surface rounded-xl">
                  <div className="text-2xl font-bold text-purple-400">{member.hoursLogged}h</div>
                  <div className="text-xs text-gray-400">Hours</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
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
        <div className="mt-8 card p-8 bg-gradient-blue-purple">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold mb-2 text-white">Grow Your Team</h2>
              <p className="text-blue-100">Invite team members to collaborate on projects</p>
            </div>
            <button className="bg-white text-purple-600 px-6 py-3 rounded-xl hover:shadow-xl transition-all font-semibold flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Invitations
            </button>
          </div>
        </div>
      </div>
  )
}
