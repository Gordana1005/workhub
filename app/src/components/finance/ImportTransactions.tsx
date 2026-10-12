'use client';

import { useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { localDateString } from '@/lib/date';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category: string;
}

interface ImportTransactionsProps {
  accountId: string;
  onImport: () => void;
  onClose: () => void;
}

const selectClass = 'block w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2 text-text-primary focus:border-primary focus:outline-none';

export default function ImportTransactions({ accountId, onImport, onClose }: ImportTransactionsProps) {
  const t = useTranslations('pages.tools');
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    amount: '',
    category: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const { currentWorkspace } = useWorkspaceStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResults(null);

    Papa.parse(uploadedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        const data = results.data as CSVRow[];
        setPreview(data);

        if (data.length > 0) {
          const csvHeaders = Object.keys(data[0]);
          setHeaders(csvHeaders);

          const autoMapping: ColumnMapping = {
            date: csvHeaders.find(h => /date|time|when/i.test(h)) || '',
            description: csvHeaders.find(h => /desc|name|merchant|note|memo/i.test(h)) || '',
            amount: csvHeaders.find(h => /amount|total|price|value/i.test(h)) || '',
            category: csvHeaders.find(h => /category|type|class/i.test(h)) || '',
          };
          setMapping(autoMapping);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error(t('finance.parseCsvFailed'));
      },
    });
  };

  const handleImport = async () => {
    if (!file || !currentWorkspace?.id || !accountId) return;

    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as CSVRow[];
        const categories = await loadCategories();

        for (const row of data) {
          try {
            if (!row[mapping.amount] || !row[mapping.description]) {
              failedCount++;
              continue;
            }

            const amountStr = row[mapping.amount].replace(/[^0-9.-]/g, '');
            const amount = Math.abs(parseFloat(amountStr));

            if (isNaN(amount) || amount <= 0) {
              failedCount++;
              continue;
            }

            const isNegative = row[mapping.amount].includes('-') || row[mapping.amount].includes('(');
            const type = isNegative ? 'expense' : 'income';

            let dateString = localDateString();
            if (mapping.date && row[mapping.date]) {
              const rawDate = String(row[mapping.date]).trim();
              const parsedDate = new Date(rawDate);
              if (!isNaN(parsedDate.getTime())) {
                // ISO date-only strings parse as UTC midnight; keep their calendar day as written.
                dateString = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : localDateString(parsedDate);
              }
            }

            let categoryId = null;
            if (mapping.category && row[mapping.category]) {
              const category = categories.find(
                c => c.name.toLowerCase() === row[mapping.category].toLowerCase()
              );
              categoryId = category?.id || null;
            }

            const { error } = await supabase
              .from('finance_transactions')
              .insert({
                workspace_id: currentWorkspace.id,
                account_id: accountId,
                category_id: categoryId,
                type: type,
                amount: amount,
                description: row[mapping.description],
                date: dateString,
              });

            if (error) {
              console.error('Failed to insert transaction:', error);
              failedCount++;
            } else {
              successCount++;
            }
          } catch (error) {
            console.error('Error processing row:', error);
            failedCount++;
          }
        }

        setImportResults({ success: successCount, failed: failedCount });
        setIsImporting(false);

        if (successCount > 0) {
          onImport();
        }
      },
    });
  };

  const loadCategories = async () => {
    if (!currentWorkspace?.id) return [];

    const { data } = await supabase
      .from('finance_categories')
      .select('*')
      .or(`workspace_id.eq.${currentWorkspace.id},is_system.eq.true`);

    return data || [];
  };

  const fieldLabel = (field: string) => {
    if (field === 'description') return t('finance.fieldDescriptionRequired');
    if (field === 'amount') return t('finance.fieldAmountRequired');
    if (field === 'date') return t('finance.fieldDate');
    return t('finance.fieldCategory');
  };

  return (
    <Dialog
      open
      title={t('finance.importTitle')}
      onClose={onClose}
      size="lg"
      footer={file && !importResults ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('finance.cancel')}
          </Button>
          <Button type="button" onClick={handleImport} disabled={isImporting || !mapping.description || !mapping.amount}>
            {isImporting ? t('finance.importing') : t('finance.importTransactions')}
          </Button>
        </div>
      ) : undefined}
    >
      {!file && (
        <div className="rounded-xl border-2 border-dashed border-border px-4 py-10 text-center">
          <Upload className="mx-auto mb-4 h-10 w-10 text-text-muted" />
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex cursor-pointer rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-hover focus-within:ring-2"
          >
            {t('finance.chooseCsv')}
          </label>
          <p className="mt-3 text-sm text-text-muted">{t('finance.uploadHint')}</p>
        </div>
      )}

      {file && !importResults && (
        <div className="min-w-0 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-medium text-text-primary">{file.name}</p>
              <p className="text-sm text-text-secondary">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview([]);
                setHeaders([]);
              }}
              className="shrink-0 text-sm text-danger hover:underline"
            >
              {t('finance.remove')}
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-text-primary">{t('finance.mapColumns')}</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {Object.entries(mapping).map(([field, value]) => (
                <div key={field} className="min-w-0">
                  <label className="mb-1.5 block text-sm text-text-secondary">{fieldLabel(field)}</label>
                  <select
                    value={value}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">{t('finance.selectColumn')}</option>
                    {headers.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-secondary">{t('finance.requiredFields')}</p>
          </div>

          {preview.length > 0 && (
            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-medium text-text-primary">{t('finance.previewRows')}</h3>
              <ul className="space-y-2 lg:hidden">
                {preview.map((row, i) => (
                  <li key={i} className="rounded-xl border border-border bg-surface-hover p-3 text-sm">
                    <p className="break-words font-medium text-text-primary">{row[mapping.description] || '-'}</p>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-secondary">{t('finance.fieldAmount')}</dt>
                        <dd className="text-right text-text-primary">{row[mapping.amount] || '-'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-secondary">{t('finance.fieldDate')}</dt>
                        <dd className="text-right text-text-primary">{row[mapping.date] || '-'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-secondary">{t('finance.fieldCategory')}</dt>
                        <dd className="break-words text-right text-text-primary">{row[mapping.category] || '-'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-lg bg-surface-hover lg:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="p-3 text-left font-medium text-text-secondary">{t('finance.fieldDate')}</th>
                      <th className="p-3 text-left font-medium text-text-secondary">{t('finance.fieldDescription')}</th>
                      <th className="p-3 text-right font-medium text-text-secondary">{t('finance.fieldAmount')}</th>
                      <th className="p-3 text-left font-medium text-text-secondary">{t('finance.fieldCategory')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-3 text-text-primary">{row[mapping.date] || '-'}</td>
                        <td className="p-3 text-text-primary">{row[mapping.description] || '-'}</td>
                        <td className="p-3 text-right text-text-primary">{row[mapping.amount] || '-'}</td>
                        <td className="p-3 text-text-primary">{row[mapping.category] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {importResults && (
        <div className="py-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">{t('finance.importComplete')}</h3>
          <p className="mb-5 mt-2 text-sm text-text-secondary">
            {importResults.failed > 0
              ? t('finance.importSummaryFailed', { success: importResults.success, failed: importResults.failed })
              : t('finance.importSummary', { success: importResults.success })}
          </p>
          <Button type="button" onClick={onClose}>
            {t('finance.close')}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
