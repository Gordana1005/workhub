import OnboardingForm from '@/components/auth/OnboardingForm'

export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <OnboardingForm />
    </div>
  )
}