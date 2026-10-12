import { clsx } from 'clsx'
import type { ReactNode } from 'react'

/** Keyboard key cap: <Kbd>Esc</Kbd>, <Kbd>⌘</Kbd><Kbd>K</Kbd> */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={clsx(
        'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-border-strong bg-surface px-1.5 font-sans text-[11px] font-semibold leading-none text-text-secondary shadow-[0_1px_0_rgb(var(--rgb-border-strong))]',
        className
      )}
    >
      {children}
    </kbd>
  )
}
