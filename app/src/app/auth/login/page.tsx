import LoginForm from '@/components/auth/LoginForm'
import AuthToolbar from '@/components/auth/AuthToolbar'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.1),transparent_28%)]" />
      <AuthToolbar />
      <LoginForm />
    </div>
  )
}