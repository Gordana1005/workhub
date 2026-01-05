import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsOptions {
  onNewTask?: () => void;
  onNewProject?: () => void;
  onSearch?: () => void;
  onCommandPalette?: () => void;
  onToggleTimer?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const router = useRouter();

  // N - New Task
  useHotkeys('n', (e) => {
    e.preventDefault();
    if (options.onNewTask) {
      options.onNewTask();
    }
  }, { enableOnFormTags: false });

  // P - New Project
  useHotkeys('p', (e) => {
    e.preventDefault();
    if (options.onNewProject) {
      options.onNewProject();
    }
  }, { enableOnFormTags: false });

  // F - Search/Filter
  useHotkeys('f', (e) => {
    e.preventDefault();
    if (options.onSearch) {
      options.onSearch();
    }
  }, { enableOnFormTags: false });

  // Ctrl+K or Cmd+K - Command Palette
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    if (options.onCommandPalette) {
      options.onCommandPalette();
    }
  });

  // Space - Start/Pause Timer
  useHotkeys('space', (e) => {
    e.preventDefault();
    if (options.onToggleTimer) {
      options.onToggleTimer();
    }
  }, { enableOnFormTags: false });

  // Escape - Close modals (handled by individual components)
  useHotkeys('escape', (e) => {
    e.preventDefault();
    // Individual components should listen for this
  });

  // Navigation shortcuts
  useHotkeys('g d', () => router.push('/dashboard'), { enableOnFormTags: false });
  useHotkeys('g t', () => router.push('/dashboard/tasks'), { enableOnFormTags: false });
  useHotkeys('g p', () => router.push('/dashboard/projects'), { enableOnFormTags: false });
  useHotkeys('g n', () => router.push('/dashboard/notes'), { enableOnFormTags: false });
  useHotkeys('g r', () => router.push('/dashboard/reports'), { enableOnFormTags: false });
  useHotkeys('g f', () => router.push('/dashboard/focus'), { enableOnFormTags: false });
}

export function useGlobalKeyboardShortcuts() {
  const router = useRouter();

  // Global shortcuts that work everywhere
  useHotkeys('mod+/', (e) => {
    e.preventDefault();
    // Show keyboard shortcuts help modal
    console.log('Show keyboard shortcuts help');
  });

  return null;
}
