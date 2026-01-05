'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import { Command } from 'cmdk';
import { 
  Search, 
  Plus, 
  CheckSquare, 
  FolderPlus, 
  FileText, 
  Clock, 
  Target,
  LayoutDashboard,
  ListTodo,
  FolderOpen,
  StickyNote,
  BarChart3,
  Users,
  Settings,
  Download,
  Keyboard
} from 'lucide-react';
import './CommandPalette.css';

interface CommandPaletteProps {
  onNewTask?: () => void;
  onNewProject?: () => void;
  onNewNote?: () => void;
  onToggleTimer?: () => void;
  onExport?: () => void;
}

export default function CommandPalette({
  onNewTask,
  onNewProject,
  onNewNote,
  onToggleTimer,
  onExport
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  useHotkeys('escape', () => {
    if (isOpen) {
      setIsOpen(false);
      setSearch('');
    }
  }, { enabled: isOpen });

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const commands = [
    // Actions
    {
      group: 'Actions',
      items: [
        { icon: Plus, label: 'New Task', shortcut: 'N', action: () => { onNewTask?.(); setIsOpen(false); } },
        { icon: FolderPlus, label: 'New Project', shortcut: 'P', action: () => { onNewProject?.(); setIsOpen(false); } },
        { icon: FileText, label: 'New Note', action: () => { onNewNote?.(); setIsOpen(false); } },
        { icon: Clock, label: 'Toggle Timer', shortcut: 'Space', action: () => { onToggleTimer?.(); setIsOpen(false); } },
        { icon: Download, label: 'Export Data', action: () => { onExport?.(); setIsOpen(false); } },
        { icon: Keyboard, label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: () => { setIsOpen(false); } },
      ]
    },
    // Navigation
    {
      group: 'Navigation',
      items: [
        { icon: LayoutDashboard, label: 'Go to Dashboard', shortcut: 'G D', action: () => { router.push('/dashboard'); setIsOpen(false); } },
        { icon: ListTodo, label: 'Go to Tasks', shortcut: 'G T', action: () => { router.push('/dashboard/tasks'); setIsOpen(false); } },
        { icon: FolderOpen, label: 'Go to Projects', shortcut: 'G P', action: () => { router.push('/dashboard/projects'); setIsOpen(false); } },
        { icon: StickyNote, label: 'Go to Notes', shortcut: 'G N', action: () => { router.push('/dashboard/notes'); setIsOpen(false); } },
        { icon: BarChart3, label: 'Go to Reports', shortcut: 'G R', action: () => { router.push('/dashboard/reports'); setIsOpen(false); } },
        { icon: Target, label: 'Go to Focus Mode', shortcut: 'G F', action: () => { router.push('/dashboard/focus'); setIsOpen(false); } },
        { icon: Users, label: 'Go to Team', action: () => { router.push('/dashboard/team'); setIsOpen(false); } },
        { icon: Settings, label: 'Go to Settings', action: () => { router.push('/dashboard/settings'); setIsOpen(false); } },
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <Command className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <Search className="w-5 h-5 text-gray-400" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="command-palette-input"
            autoFocus
          />
        </div>

        <Command.List className="command-palette-list">
          <Command.Empty className="command-palette-empty">
            No results found.
          </Command.Empty>

          {commands.map((group) => (
            <Command.Group key={group.group} heading={group.group} className="command-palette-group">
              {group.items.map((item, idx) => (
                <Command.Item
                  key={idx}
                  onSelect={item.action}
                  className="command-palette-item"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="command-palette-shortcut">
                      {item.shortcut}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="command-palette-footer">
          Navigate with <kbd>↑</kbd> <kbd>↓</kbd> · Select with <kbd>↵</kbd> · Close with <kbd>Esc</kbd>
        </div>
      </Command>
    </div>
  );
}
