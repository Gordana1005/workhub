'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Card whose body is collapsed behind a 48px header button on phones/tablets (below md),
 * and always open at md+. `actions` stay visible while collapsed.
 */
export default function CollapsibleSection({
  title,
  icon,
  meta,
  actions,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const heading = (
    <>
      {icon}
      <span className="min-w-0 truncate">{title}</span>
    </>
  );

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-2 pr-3">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-text-primary md:hidden">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-4 text-left transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-text-secondary"
          >
            {heading}
            {meta ? <span className="ml-auto shrink-0 pl-2 text-xs font-normal text-text-secondary">{meta}</span> : null}
            <ChevronDown
              aria-hidden
              className={`!h-4 !w-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''} ${meta ? '' : 'ml-auto'}`}
            />
          </button>
        </h2>
        <h2 className="hidden min-w-0 flex-1 items-center gap-2 px-4 pb-2 pt-4 text-base font-semibold text-text-primary md:flex [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-text-secondary">
          {heading}
          {meta ? <span className="ml-auto shrink-0 text-xs font-normal text-text-secondary">{meta}</span> : null}
        </h2>
        {actions ? <div className="shrink-0 md:pt-2">{actions}</div> : null}
      </header>
      <div className={open ? '' : 'hidden md:block'}>{children}</div>
    </section>
  );
}
