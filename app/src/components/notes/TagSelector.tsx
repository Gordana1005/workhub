'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  workspaceId: string;
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // orange
  '#10b981', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

export default function TagSelector({ workspaceId, selectedTags, onChange }: TagSelectorProps) {
  const t = useTranslations('pages.notes');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 288, maxHeight: 420, full: false });

  const placeMenu = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (window.innerWidth < 640) {
      setMenuBox({ top: 0, left: 0, width: window.innerWidth, maxHeight: window.innerHeight, full: true });
      return;
    }
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const maxHeight = Math.min(420, window.innerHeight - 16);
    let top = rect.bottom + 4;
    if (top + maxHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - maxHeight - 4);
    }
    setMenuBox({ top, left, width, maxHeight, full: false });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [isOpen, placeMenu]);

  const loadTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (!error && data) {
      setAllTags(data);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadTags();
    }
  }, [workspaceId, loadTags]);

  const createTag = async () => {
    if (!newTagName.trim()) return;

    const { data, error } = await supabase
      .from('tags')
      .insert({
        workspace_id: workspaceId,
        name: newTagName.trim(),
        color: newTagColor,
      })
      .select()
      .single();

    if (!error && data) {
      setAllTags([...allTags, data]);
      onChange([...selectedTags, data]);
      setNewTagName('');
      setIsCreating(false);
      setSearchQuery('');
    }
  };

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      onChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedTags.find(t => t.id === tag.id)
  );

  return (
    <div className="relative min-w-0">
      {/* Selected Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex h-10 max-w-full items-center gap-1 rounded-full pl-3 pr-1.5 text-sm font-medium text-white sm:h-8 sm:text-xs"
            style={{ backgroundColor: tag.color }}
          >
            <span className="truncate">{tag.name}</span>
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/25 active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-6 sm:w-6"
              aria-label={t('removeTag')}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          ref={anchorRef}
          onClick={() => {
            if (!isOpen) placeMenu();
            setIsOpen(!isOpen);
          }}
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 text-sm font-medium text-text-secondary active:bg-tertiary sm:h-8 sm:px-3 sm:text-xs transition-colors hover:border-primary/50 hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <TagIcon className="w-3 h-3" />
          {t('addTag')}
        </button>
      </div>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => {
                setIsOpen(false);
                setIsCreating(false);
                setSearchQuery('');
              }}
            />
            <div
              className={`fixed z-[80] max-w-full overflow-y-auto border-border bg-surface text-text-primary shadow-lg ${
                menuBox.full ? 'h-[100dvh]' : 'rounded-xl border shadow-xl'
              }`}
              style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width, maxHeight: menuBox.maxHeight }}
            >
          {/* Search */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchTags')}
              className="h-11 w-full min-w-0 flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-base sm:h-10 sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCreating(false);
                setSearchQuery('');
              }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover active:bg-tertiary sm:hidden"
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length > 0 ? (
              filteredTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    toggleTag(tag);
                    setSearchQuery('');
                  }}
                  className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary sm:min-h-10"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="min-w-0 truncate text-base text-text-primary sm:text-sm">{tag.name}</span>
                </button>
              ))
            ) : searchQuery ? (
              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                {t('noTagsFound')}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                {t('noMoreTags')}
              </div>
            )}
          </div>

          {/* Create New Tag */}
          <div className="border-t border-border p-3">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 active:bg-primary/80 sm:h-10"
              >
                <Plus className="w-4 h-4" />
                {t('createNewTag')}
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createTag();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  placeholder={t('tagNamePlaceholder')}
                  className="h-11 w-full px-3 py-2 bg-surface border border-border rounded-lg text-base sm:h-10 sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  autoFocus
                />
                
                {/* Color Picker */}
                <div className="flex flex-wrap gap-2 sm:gap-1">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      type="button"
                      aria-label={color}
                      className={`h-10 w-10 rounded-full transition-transform sm:h-6 sm:w-6 ${
                        newTagColor === color ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createTag}
                    disabled={!newTagName.trim()}
                    type="button"
                    className="h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:bg-surface-hover disabled:text-text-muted sm:h-10"
                  >
                    {t('create')}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewTagName('');
                    }}
                    type="button"
                    className="h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary sm:h-10"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
            </div>
          </>,
          document.body,
        )
        : null}
    </div>
  );
}
