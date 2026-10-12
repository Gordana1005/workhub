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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('pages.tools');

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
    {
      group: t('command.groupActions'),
      items: [
        { icon: Plus, label: t('command.newTask'), shortcut: 'N', action: () => { onNewTask?.(); setIsOpen(false); } },
        { icon: FolderPlus, label: t('command.newProject'), shortcut: 'P', action: () => { onNewProject?.(); setIsOpen(false); } },
        { icon: FileText, label: t('command.newNote'), action: () => { onNewNote?.(); setIsOpen(false); } },
        { icon: Clock, label: t('command.toggleTimer'), shortcut: t('command.space'), action: () => { onToggleTimer?.(); setIsOpen(false); } },
        { icon: Download, label: t('command.exportData'), action: () => { onExport?.(); setIsOpen(false); } },
        { icon: Keyboard, label: t('command.keyboardShortcuts'), shortcut: 'Ctrl+/', action: () => { setIsOpen(false); } },
      ]
    },
    {
      group: t('command.groupNavigation'),
      items: [
        { icon: LayoutDashboard, label: t('command.goDashboard'), shortcut: 'G D', action: () => { router.push('/dashboard'); setIsOpen(false); } },
        { icon: ListTodo, label: t('command.goTasks'), shortcut: 'G T', action: () => { router.push('/dashboard/tasks'); setIsOpen(false); } },
        { icon: FolderOpen, label: t('command.goProjects'), shortcut: 'G P', action: () => { router.push('/dashboard/projects'); setIsOpen(false); } },
        { icon: StickyNote, label: t('command.goNotes'), shortcut: 'G N', action: () => { router.push('/dashboard/notes'); setIsOpen(false); } },
        { icon: BarChart3, label: t('command.goReports'), shortcut: 'G R', action: () => { router.push('/dashboard/reports'); setIsOpen(false); } },
        { icon: Target, label: t('command.goFocus'), shortcut: 'G F', action: () => { router.push('/dashboard/focus'); setIsOpen(false); } },
        { icon: Users, label: t('command.goTeam'), action: () => { router.push('/dashboard/team'); setIsOpen(false); } },
        { icon: Settings, label: t('command.goSettings'), action: () => { router.push('/dashboard/settings'); setIsOpen(false); } },
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <Command className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <Search className="w-5 h-5 text-text-secondary" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={t('command.placeholder')}
            className="command-palette-input"
            autoFocus
          />
        </div>

        <Command.List className="command-palette-list">
          <Command.Empty className="command-palette-empty">
            {t('command.empty')}
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
          {t('command.navigate')} <kbd>↑</kbd> <kbd>↓</kbd> · {t('command.select')} <kbd>↵</kbd> · {t('command.close')} <kbd>Esc</kbd>
        </div>
      </Command>
    </div>
  );
}
