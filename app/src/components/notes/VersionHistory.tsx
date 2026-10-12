'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface NoteVersion {
  id: string;
  note_id: string;
  content: string;
  title: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
}

interface VersionHistoryProps {
  noteId: string;
  currentContent: string;
  currentTitle: string;
  onRestore: (content: string, title: string) => void;
  onClose: () => void;
}

const previewClass =
  'max-w-none break-words text-text-primary [&_a]:text-primary [&_a]:underline [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-hover [&_pre]:p-3 [&_pre]:text-text-primary [&_ul]:list-disc [&_ul]:pl-5';

export default function VersionHistory({
  noteId,
  currentContent,
  currentTitle,
  onRestore,
  onClose,
}: VersionHistoryProps) {
  const t = useTranslations('pages.notes');
  const locale = useLocale();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', noteId)
      .order('version_number', { ascending: false });

    if (!error && data) {
      setVersions(data);
    }
    setLoading(false);
  }, [noteId]);

  useEffect(() => {
    loadVersions();
  }, [noteId, loadVersions]);

  const handleRestore = () => {
    if (selectedVersion) {
      onRestore(selectedVersion.content, selectedVersion.title);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('daysAgo', { count: diffDays });

    return date.toLocaleDateString(locale === 'mk' ? 'mk-MK' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const previewTitle = selectedVersion?.title || currentTitle;
  const previewHtml = selectedVersion?.content ?? currentContent;
  const previewMeta = selectedVersion
    ? t('versionMeta', { number: selectedVersion.version_number, when: formatDate(selectedVersion.created_at) })
    : t('currentVersion');

  return (
    <Dialog
      open
      title={t('versionHistory')}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
          {selectedVersion ? (
            <Button type="button" onClick={handleRestore} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('restoreVersion')}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
        <div className="min-w-0 sm:max-h-[50vh] sm:w-52 sm:shrink-0 sm:overflow-y-auto">
          <button
            type="button"
            onClick={() => setSelectedVersion(null)}
            className={`mb-2 w-full min-w-0 rounded-xl p-3 text-left ${
              !selectedVersion
                ? 'bg-primary text-white'
                : 'border border-border bg-secondary text-text-primary hover:bg-surface-hover'
            }`}
          >
            <span className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 shrink-0" />
              {t('currentVersion')}
            </span>
            <span className="line-clamp-2 block text-xs opacity-80">
              {stripHtml(currentContent).slice(0, 100)}
            </span>
          </button>

          {loading ? (
            <p className="py-6 text-center text-sm text-text-secondary">{t('loadingVersions')}</p>
          ) : versions.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-secondary">
              <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>{t('noPreviousVersions')}</p>
            </div>
          ) : (
            versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedVersion(version)}
                className={`mb-2 w-full min-w-0 rounded-xl p-3 text-left ${
                  selectedVersion?.id === version.id
                    ? 'bg-primary text-white'
                    : 'border border-border bg-secondary text-text-primary hover:bg-surface-hover'
                }`}
              >
                <span className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{t('version', { number: version.version_number })}</span>
                  <span className="shrink-0 text-xs opacity-70">{formatDate(version.created_at)}</span>
                </span>
                <span className="line-clamp-2 block text-xs opacity-80">
                  {stripHtml(version.content).slice(0, 80)}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-x-hidden border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <h3 className="break-words text-xl font-semibold text-text-primary">{previewTitle}</h3>
          <p className="mb-4 mt-1 text-sm text-text-secondary">{previewMeta}</p>
          <div className={previewClass} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
    </Dialog>
  );
}
