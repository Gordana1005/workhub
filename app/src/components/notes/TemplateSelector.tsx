'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  icon: string;
  usage_count: number;
}

interface TemplateSelectorProps {
  workspaceId: string;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All Templates' },
  { value: 'meeting', label: '📅 Meeting' },
  { value: 'project', label: '📁 Project' },
  { value: 'documentation', label: '📖 Documentation' },
  { value: 'brainstorm', label: '💡 Brainstorm' },
  { value: 'general', label: '📝 General' },
];

export default function TemplateSelector({ workspaceId, onSelect, onClose }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      loadTemplates();
    }
  }, [workspaceId]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('note_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('usage_count', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSelectTemplate = async (template: Template) => {
    // Increment usage count
    await supabase
      .from('note_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id);

    onSelect(template);
    onClose();
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Choose a Template
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10 overflow-x-auto">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-slate-400">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold mb-2">No templates found</h3>
              <p className="text-slate-400">
                {selectedCategory === 'all'
                  ? 'Create your first template to get started'
                  : 'No templates in this category'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="group text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                    <span className="text-xs text-slate-500 capitalize">
                      {template.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      Used {template.usage_count} times
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Start from Scratch
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
