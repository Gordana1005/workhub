'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function OnboardingForm() {
  const [username, setUsername] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

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
          username,
          job_title: jobTitle,
          department
        })

      if (profileError) {
        setError(profileError.message)
      } else {
        setSuccess('Profile saved. Head to your dashboard to create a workspace when you are ready.')
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl relative z-10">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-stretch bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="hidden lg:flex flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-600/18 via-blue-500/12 to-emerald-500/12 border border-white/10 p-6">
          <div className="space-y-4 text-white">
            <p className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 w-fit">Finish your profile</p>
            <h2 className="text-3xl font-bold leading-tight">Set your username so teammates can find you, then create your first workspace.</h2>
            <ul className="space-y-2 text-slate-200/85 text-sm">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Unique username for invites</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-300" /> Secure, email-based account</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Next: create your first workspace</li>
            </ul>
          </div>
          <div className="text-xs text-slate-200/70 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Your profile is private to your team.</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-2 text-white">Complete Your Profile</h2>
          <p className="text-center text-slate-400 mb-6">
            Tell us a bit about yourself to get started.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2 text-slate-200">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Pick a unique username"
                required
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-medium mb-2 text-slate-200">
                Job Title
              </label>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Product Manager"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium mb-2 text-slate-200">
                Department
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Engineering"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-500 hover:text-blue-400 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}