import SignupForm from '@/components/auth/SignupForm'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_25%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_70%_75%,rgba(14,165,233,0.1),transparent_28%)]" />
      <SignupForm />
    </div>
  )
}