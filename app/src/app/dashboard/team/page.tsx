'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Shield, Crown, Search, MoreVertical, Trash2, Edit, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import useWorkspaceStore from '@/stores/useWorkspaceStore'

interface TeamMember {
  id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
    email: string
  }
}

export default function TeamPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadTeamMembers = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const response = await fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (response.ok) {
        setTeamMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (currentWorkspace) {
      loadTeamMembers()
    }
  }, [currentWorkspace, loadTeamMembers])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace || !addUsername) return

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          username: addUsername
        })
      })

      const data = await response.json()
      if (response.ok) {
        setAddUsername('')
        setShowAddDialog(false)
        loadTeamMembers()
      } else {
        alert(data.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    }
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setAddUsername('')
  }

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/team?workspace_id=${currentWorkspace.id}&user_id=${userId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadTeamMembers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(
        `/api/team?workspace_id=${currentWorkspace.id}&user_id=${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        }
      )

      if (response.ok) {
        loadTeamMembers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role')
    }
  }



  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.slice(0, 2).toUpperCase()
  }

  const filteredMembers = teamMembers.filter(member =>
    member.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!mounted) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
            👥 Team Members
          </h1>
          <p className="text-gray-400 text-base md:text-lg">Manage your workspace team</p>
        </div>
        
        {/* Loading state */}
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-gray-400">Please select a workspace</p>
        </div>
      </div>
    )
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
                  {mounted ? teamMembers.length : '...'}
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
                  {mounted ? teamMembers.filter(m => m.role === 'admin').length : '...'}
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
                <p className="text-gray-400 text-sm mb-1">Members</p>
                <p className="text-4xl font-bold text-white">
                  {mounted ? teamMembers.filter(m => m.role === 'member').length : '...'}
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
          <button 
            onClick={() => setShowAddDialog(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Member
          </button>
        </div>

        {/* Team Members Grid */}
        {loading || !mounted ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="card p-6 card-hover"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <Avatar 
                    src={member.profiles.avatar_url}
                    alt={member.profiles.username || 'User'}
                    fallback={getInitials(member.profiles.username)}
                    size="xl"
                    className="w-16 h-16 rounded-xl"
                  />
                  <div className="relative group">
                    <button className="p-2 hover:bg-surface-light rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[160px]">
                      <button
                        onClick={() => handleChangeRole(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {member.profiles.username || 'Unnamed User'}
                  </h3>
                  <div className="flex items-center text-sm text-gray-400 mb-2">
                    <Mail className="w-4 h-4 mr-1" />
                    {member.profiles.email}
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    member.role === 'admin' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                  </span>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 text-sm text-gray-400">
                  <span>Joined {mounted ? new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '...'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Add Team Member</h2>
              
              <form onSubmit={handleAddMember}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    required
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., alice"
                  />
                  <p className="text-xs text-gray-400 mt-2">Enter the username of an existing user to add them to this workspace.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAddDialog}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    disabled={!addUsername}
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  )
}
