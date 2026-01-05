'use client';

import { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { category: 'Actions', items: [
    { keys: ['N'], description: 'Create new task' },
    { keys: ['P'], description: 'Create new project' },
    { keys: ['F'], description: 'Search/Filter tasks' },
    { keys: ['Space'], description: 'Start/Pause timer' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['G', 'D'], description: 'Go to Dashboard' },
    { keys: ['G', 'T'], description: 'Go to Tasks' },
    { keys: ['G', 'P'], description: 'Go to Projects' },
    { keys: ['G', 'N'], description: 'Go to Notes' },
    { keys: ['G', 'R'], description: 'Go to Reports' },
    { keys: ['G', 'F'], description: 'Go to Focus Mode' },
  ]},
  { category: 'Global', items: [
    { keys: ['Ctrl', 'K'], description: 'Open command palette', mac: ['⌘', 'K'] },
    { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts', mac: ['⌘', '/'] },
    { keys: ['Esc'], description: 'Close modal/dialog' },
  ]},
];

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold gradient-text">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-purple-400 uppercase mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-300">{item.description}</span>
                    <div className="flex gap-1">
                      {(isMac && item.mac ? item.mac : item.keys).map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-3 py-1 text-xs font-semibold bg-surface-light/50 rounded border border-white/10 min-w-[2rem] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-gray-400">
          Press <kbd className="px-2 py-1 bg-surface-light/50 rounded border border-white/10">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
