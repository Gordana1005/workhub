import ThemeSwitch from '@/components/shell/ThemeSwitch'
import LanguageSwitch from '@/components/shell/LanguageSwitch'

export default function AuthToolbar() {
  return (
    <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex items-center gap-2 sm:right-6 sm:top-[max(1.5rem,env(safe-area-inset-top))]">
      <LanguageSwitch />
      <ThemeSwitch />
    </div>
  )
}
