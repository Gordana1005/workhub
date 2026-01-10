'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const router = useRouter()

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setErrors({ general: error.message })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl relative z-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="hidden lg:flex flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-emerald-500/10 border border-white/10 p-6">
          <div className="space-y-4 text-white">
            <p className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 w-fit">Welcome to TrackWork</p>
            <h2 className="text-3xl font-bold leading-tight">Plan, ship, and collaborate from idea to production.</h2>
            <p className="text-slate-200/80 text-sm">Securely manage tasks, projects, time tracking, and team collaboration in one place.</p>
          </div>
          <div className="mt-6 space-y-3 text-sm text-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Email sign-in is available now.
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Google / GitHub sign-in is temporarily disabled.
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400">Sign in with your email to continue</p>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {errors.general}
          </div>
        )}

        <div className="mb-6">
          <Link href="/auth/signup" className="block">
            <Button
              type="button"
              variant="primary"
              className="w-full py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Create a TrackWork account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Google and GitHub sign-in are temporarily unavailable. Use email instead.
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900 text-slate-500">Or sign in with email</span>
          </div>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              className={`w-full px-4 py-3 bg-slate-800 border ${
                errors.email ? 'border-red-500' : 'border-slate-700'
              } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                className={`w-full px-4 py-3 pr-12 bg-slate-800 border ${
                  errors.password ? 'border-red-500' : 'border-slate-700'
                } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default LoginForm;
export { LoginForm };