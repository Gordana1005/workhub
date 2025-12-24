'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function OnboardingForm() {
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('User not authenticated')
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          job_title: jobTitle,
          department
        })

      if (profileError) {
        setError(profileError.message)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md p-8 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark bg-surface">
      <h2 className="text-2xl font-bold text-center mb-6">Complete Your Profile</h2>
      <p className="text-center text-text-secondary mb-6">
        Tell us a bit about yourself to get started
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-4 rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset bg-surface border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium mb-2">
            Job Title
          </label>
          <input
            id="jobTitle"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full p-4 rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset bg-surface border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Product Manager"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium mb-2">
            Department
          </label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-4 rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset bg-surface border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Engineering"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Complete Setup'}
        </Button>
      </form>
    </div>
  )
}