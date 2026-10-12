'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Kbd } from '@/components/ui/Kbd';

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

export default function KeyboardShortcutsDialog() {
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

  return (
    <Dialog open={isOpen} title={t('shortcuts.title')} onClose={close} size="lg">
      <div className="space-y-6">
        {shortcuts.map((category) => (
          <section key={category.categoryKey} aria-labelledby={`sc-${category.categoryKey}`}>
            <h3
              id={`sc-${category.categoryKey}`}
              className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              {t(category.categoryKey)}
            </h3>
            <ul className="divide-y divide-border">
              {category.items.map((item) => (
                <li
                  key={item.descriptionKey}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0 text-sm text-text-primary">{t(item.descriptionKey)}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {(isMac && item.mac ? item.mac : item.keys).map((key, index) => (
                      <Kbd key={`${key}-${index}`}>{key === 'Space' ? t('shortcuts.space') : key}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="border-t border-border pt-4 text-center text-sm text-text-secondary">
          {t('shortcuts.press')} <Kbd>Esc</Kbd> {t('shortcuts.toClose')}
        </p>
      </div>
    </Dialog>
  );
}
