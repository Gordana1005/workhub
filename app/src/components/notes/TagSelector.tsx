'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (workspaceId) {
      loadTags();
    }
  }, [workspaceId]);

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (!error && data) {
      setAllTags(data);
    }
  };

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
    <div className="relative">
      {/* Selected Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              className="hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 transition-colors"
        >
          <TagIcon className="w-3 h-3" />
          Add Tag
        </button>
      </div>

      {/* Tag Selector Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Tag List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length > 0 ? (
              filteredTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    toggleTag(tag);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors text-left"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-white">{tag.name}</span>
                </button>
              ))
            ) : searchQuery ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No tags found
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No more tags available
              </div>
            )}
          </div>

          {/* Create New Tag */}
          <div className="border-t border-slate-700 p-3">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Tag
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
                  placeholder="Tag name..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                
                {/* Color Picker */}
                <div className="flex gap-1">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createTag}
                    disabled={!newTagName.trim()}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewTagName('');
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setIsCreating(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}
