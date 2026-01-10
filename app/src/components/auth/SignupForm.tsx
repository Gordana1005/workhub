'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push('/auth/onboarding')
      } else {
        setError('Please check your email to confirm your account.')
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
            <p className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 w-fit">Create your TrackWork account</p>
            <h2 className="text-3xl font-bold leading-tight">Get from idea to production with tasks, projects, and time tracking in one place.</h2>
            <ul className="space-y-2 text-slate-200/85 text-sm">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Secure email-based signup</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-300" /> Workspace-ready out of the box</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Manage tasks, projects, and time</li>
            </ul>
          </div>
          <div className="text-xs text-slate-200/70 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Email + password only; social sign-in is temporarily disabled.</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-2 text-white">Create Account</h2>
          <p className="text-center text-slate-400 mb-6">Use your email to get started with TrackWork.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Create a password"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-slate-200">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating account...' : 'Create Account'}
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