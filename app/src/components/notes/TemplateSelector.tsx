'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

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
  { value: 'all' },
  { value: 'meeting' },
  { value: 'project' },
  { value: 'documentation' },
  { value: 'brainstorm' },
  { value: 'general' },
] as const;

export default function TemplateSelector({ workspaceId, onSelect, onClose }: TemplateSelectorProps) {
  const t = useTranslations('pages.notes');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
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
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadTemplates();
    }
  }, [workspaceId, loadTemplates]);

  const handleSelectTemplate = async (template: Template) => {
    await supabase
      .from('note_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id);

    onSelect(template);
    onClose();
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter((template) => template.category === selectedCategory);

  const categoryLabel = (category: string) => {
    switch (category) {
      case 'meeting':
        return t('categories.meeting');
      case 'project':
        return t('categories.project');
      case 'documentation':
        return t('categories.documentation');
      case 'brainstorm':
        return t('categories.brainstorm');
      case 'general':
        return t('categories.general');
      default:
        return category;
    }
  };

  return (
    <Dialog
      open
      title={t('chooseTemplate')}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('startFromScratch')}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat.value
                ? 'bg-primary text-white'
                : 'border border-border bg-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {t(`filters.${cat.value}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-text-secondary">{t('loadingTemplates')}</p>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h3 className="mb-2 text-base font-semibold text-text-primary">{t('noTemplatesTitle')}</h3>
          <p className="text-sm text-text-secondary">
            {selectedCategory === 'all' ? t('noTemplatesAll') : t('noTemplatesCategory')}
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className="min-w-0 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary hover:bg-surface-hover"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-text-primary">{template.name}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-text-secondary">{template.description}</span>
                </span>
              </div>
              <span className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-text-secondary">
                <span className="min-w-0 truncate">{categoryLabel(template.category)}</span>
                <span className="shrink-0">{t('usedTimes', { count: template.usage_count })}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
