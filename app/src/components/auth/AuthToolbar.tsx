import ThemeSwitch from '@/components/shell/ThemeSwitch'
import LanguageSwitch from '@/components/shell/LanguageSwitch'

export default function AuthToolbar() {
  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
      <LanguageSwitch />
      <ThemeSwitch />
    </div>
  )
}
