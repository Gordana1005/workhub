'use client';

import { useState } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import type { ExportFormat } from '@/lib/export';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  dataType: 'tasks' | 'time-entries' | 'projects' | 'notes';
  defaultFilename?: string;
}

export default function ExportDialog({
  isOpen,
  onClose,
  data,
  dataType,
  defaultFilename
}: ExportDialogProps) {
  const t = useTranslations('pages.tools');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState(defaultFilename || `${dataType}-export`);

  const typeLabels: Record<ExportDialogProps['dataType'], string> = {
    tasks: t('export.typeTasks'),
    'time-entries': t('export.typeTimeEntries'),
    projects: t('export.typeProjects'),
    notes: t('export.typeNotes'),
  };

  const handleExport = async () => {
    const options = { format, filename };
    // papaparse lives in lib/export: fetch it only when someone actually exports
    const { exportTasks, exportTimeEntries, exportProjects, exportNotes } = await import('@/lib/export');

    switch (dataType) {
      case 'tasks':
        exportTasks(data, options);
        break;
      case 'time-entries':
        exportTimeEntries(data, options);
        break;
      case 'projects':
        exportProjects(data, options);
        break;
      case 'notes':
        exportNotes(data, options);
        break;
    }

    onClose();
  };

  const formats = [
    { value: 'csv' as ExportFormat, label: t('export.csv'), icon: FileSpreadsheet, description: t('export.csvHelp') },
    { value: 'json' as ExportFormat, label: t('export.json'), icon: FileJson, description: t('export.jsonHelp') },
    { value: 'markdown' as ExportFormat, label: t('export.markdown'), icon: FileText, description: t('export.markdownHelp') },
  ];

  return (
    <Dialog
      open={isOpen}
      title={t('export.title')}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={onClose}>
            {t('export.cancel')}
          </Button>
          <Button type="button" onClick={handleExport} disabled={!filename.trim()} className="h-12 gap-2 sm:h-10">
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('export.export')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">{t('export.format')}</p>
          <div className="space-y-2" role="radiogroup" aria-label={t('export.format')}>
            {formats.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={format === item.value}
                onClick={() => setFormat(item.value)}
                className={`min-h-14 w-full rounded-xl border p-3 text-left transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  format === item.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-surface-hover'
                }`}
              >
                <span className="flex items-start gap-3">
                  <item.icon className={`mt-0.5 h-5 w-5 shrink-0 ${format === item.value ? 'text-primary' : 'text-text-secondary'}`} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-text-primary">{item.label}</span>
                    <span className="mt-0.5 block text-sm text-text-secondary">{item.description}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="export-filename">
            {t('export.filename')}
          </label>
          <input
            id="export-filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="block min-h-11 w-full min-w-0 rounded-lg border border-border-control bg-secondary px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:min-h-10 sm:text-sm"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="done"
            placeholder={t('export.filenamePlaceholder')}
          />
          <p className="mt-1.5 text-xs text-text-secondary">{t('export.extensionHint')}</p>
        </div>

        <p className="rounded-lg border border-border bg-surface-hover p-3 text-sm text-text-primary">
          {t('export.exportingBefore')} <span className="font-semibold text-primary">{data.length}</span> {t('export.exportingAfter', { type: typeLabels[dataType] })}
        </p>
      </div>
    </Dialog>
  );
}
