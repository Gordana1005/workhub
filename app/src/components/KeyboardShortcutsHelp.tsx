'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';

type ShortcutItem = {
  keys: string[];
  descriptionKey: string;
  mac?: string[];
};

const shortcuts: { categoryKey: string; items: ShortcutItem[] }[] = [
  { categoryKey: 'shortcuts.actions', items: [
    { keys: ['N'], descriptionKey: 'shortcuts.newTask' },
    { keys: ['P'], descriptionKey: 'shortcuts.newProject' },
    { keys: ['F'], descriptionKey: 'shortcuts.searchTasks' },
    { keys: ['Space'], descriptionKey: 'shortcuts.timer' },
  ]},
  { categoryKey: 'shortcuts.navigation', items: [
    { keys: ['G', 'D'], descriptionKey: 'shortcuts.goDashboard' },
    { keys: ['G', 'T'], descriptionKey: 'shortcuts.goTasks' },
    { keys: ['G', 'P'], descriptionKey: 'shortcuts.goProjects' },
    { keys: ['G', 'N'], descriptionKey: 'shortcuts.goNotes' },
    { keys: ['G', 'R'], descriptionKey: 'shortcuts.goReports' },
    { keys: ['G', 'F'], descriptionKey: 'shortcuts.goFocus' },
  ]},
  { categoryKey: 'shortcuts.global', items: [
    { keys: ['Ctrl', 'K'], descriptionKey: 'shortcuts.openPalette', mac: ['⌘', 'K'] },
    { keys: ['Ctrl', '/'], descriptionKey: 'shortcuts.showShortcuts', mac: ['⌘', '/'] },
    { keys: ['Esc'], descriptionKey: 'shortcuts.closeDialog' },
  ]},
];

export default function KeyboardShortcutsHelp() {
  const t = useTranslations('pages.tools');
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  useHotkeys('mod+/', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  useHotkeys('escape', () => {
    if (isOpen) setIsOpen(false);
  }, { enabled: isOpen });

  return (
    <Dialog open={isOpen} title={t('shortcuts.title')} onClose={close} size="lg">
      <div className="space-y-5">
        {shortcuts.map((category) => (
          <section key={category.categoryKey}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t(category.categoryKey)}
            </h3>
            <ul className="divide-y divide-border">
              {category.items.map((item) => (
                <li key={item.descriptionKey} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-text-primary">{t(item.descriptionKey)}</span>
                  <span className="flex flex-wrap gap-1">
                    {(isMac && item.mac ? item.mac : item.keys).map((key) => (
                      <kbd
                        key={key}
                        className="min-w-8 rounded-md border border-border bg-surface-hover px-2 py-1 text-center text-xs font-semibold text-text-primary"
                      >
                        {key === 'Space' ? t('shortcuts.space') : key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="border-t border-border pt-4 text-center text-sm text-text-secondary">
          {t('shortcuts.press')} <kbd className="rounded-md border border-border bg-surface-hover px-2 py-1 text-xs font-semibold text-text-primary">Esc</kbd> {t('shortcuts.toClose')}
        </p>
      </div>
    </Dialog>
  );
}
