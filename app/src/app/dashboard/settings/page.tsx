'use client'

import { useState, useEffect } from 'react'
import { User, Bell, Lock, Palette, Globe, Shield, Save, Moon, Sun, Camera, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// Predefined avatar list using DiceBear
const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Felix',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Milo',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Bella',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Sora',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Leo',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Kai',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Nora',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Axel',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Luna',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Omar',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Iris',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Jaden',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Ruby'
]

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  
  // Profile State
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    job_title: '',
    department: '',
    avatar_url: ''
  })

  // Load User Data
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            email: data.email || user.email || '',
            job_title: data.job_title || '',
            department: data.department || '',
            avatar_url: data.avatar_url || AVATAR_OPTIONS[0]
          })
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          job_title: profile.job_title,
          department: profile.department,
          avatar_url: profile.avatar_url
        })
        .eq('id', userId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    // { id: 'notifications', label: 'Notifications', icon: Bell }, // Placeholder for future
    // { id: 'security', label: 'Security', icon: Lock }, // Placeholder for future
    // { id: 'preferences', label: 'Preferences', icon: Globe } // Placeholder for future
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 relative">
              
              {/* Feedback Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-lg ${
                      message.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {message.type === 'success' ? <Check className="w-4 h-4 mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Profile Information</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your photo and personal details.</p>
                  </div>
                  
                  {/* Avatar Section */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-gray-800 ring-4 ring-white dark:ring-gray-700 shadow-lg">
                          {profile.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                              {profile.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                          className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                          title="Change Avatar"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Profile Photo</h3>
                        <p className="text-sm text-gray-500 mb-4">Choose one of our professionally designed avatars.</p>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                        >
                          {showAvatarSelector ? 'Close Selection' : 'Choose Avatar'}
                        </Button>
                      </div>
                    </div>

                    {/* Avatar Selector Grid */}
                    <AnimatePresence>
                      {showAvatarSelector && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-6 overflow-hidden"
                        >
                           <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {AVATAR_OPTIONS.map((url, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setProfile({ ...profile, avatar_url: url })
                                  setShowAvatarSelector(false)
                                }}
                                className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                  profile.avatar_url === url 
                                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                                    : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                }`}
                              >
                                <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover bg-white dark:bg-gray-800" />
                                {profile.avatar_url === url && (
                                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                    <Check className="w-6 h-6 text-blue-600" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed"
                        title="Email cannot be changed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={profile.job_title}
                        onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        placeholder="Product Manager"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        placeholder="Engineering"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
                    <Button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
