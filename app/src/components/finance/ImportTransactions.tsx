'use client';

import { useState } from 'react';
import { Upload, CheckCircle, XCircle, X } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

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

export default function ImportTransactions({ accountId, onImport, onClose }: ImportTransactionsProps) {
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
          
          // Auto-detect columns
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
        alert('Failed to parse CSV file. Please check the format.');
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
            // Skip empty rows
            if (!row[mapping.amount] || !row[mapping.description]) {
              failedCount++;
              continue;
            }

            // Parse amount (remove currency symbols and commas)
            const amountStr = row[mapping.amount].replace(/[^0-9.-]/g, '');
            const amount = Math.abs(parseFloat(amountStr));
            
            if (isNaN(amount) || amount <= 0) {
              failedCount++;
              continue;
            }

            // Determine type (income or expense)
            // Negative amounts or amounts with parentheses are expenses
            const isNegative = row[mapping.amount].includes('-') || row[mapping.amount].includes('(');
            const type = isNegative ? 'expense' : 'income';

            // Parse date
            let date = new Date();
            if (mapping.date && row[mapping.date]) {
              const parsedDate = new Date(row[mapping.date]);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate;
              }
            }

            // Find category
            let categoryId = null;
            if (mapping.category && row[mapping.category]) {
              const category = categories.find(
                c => c.name.toLowerCase() === row[mapping.category].toLowerCase()
              );
              categoryId = category?.id || null;
            }

            // Insert transaction
            const { error } = await supabase
              .from('finance_transactions')
              .insert({
                workspace_id: currentWorkspace.id,
                account_id: accountId,
                category_id: categoryId,
                type: type,
                amount: amount,
                description: row[mapping.description],
                date: date.toISOString().split('T')[0],
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface/90 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[80vh] mt-20 sm:mt-0 overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Import Transactions from CSV</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-auto">
          {!file && (
            <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center">
              <Upload className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer px-6 py-3 bg-surface hover:bg-surface-hover text-white rounded-xl inline-block transition-colors border border-white/10"
              >
                Choose CSV File
              </label>
              <p className="text-sm text-text-muted mt-4">
                Upload a CSV file with columns for date, description, amount, and category
              </p>
            </div>
          )}

          {file && !importResults && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                      setHeaders([]);
                    }}
                    className="text-sm text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Map Columns</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(mapping).map(([field, value]) => (
                    <div key={field}>
                      <label className="block text-sm text-slate-400 mb-2 capitalize">
                        {field === 'description' ? 'Description *' : field === 'amount' ? 'Amount *' : field}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select column...</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">* Required fields</p>
              </div>

              {preview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3">Preview (first 5 rows)</h3>
                  <div className="bg-slate-800 rounded-lg overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-700">
                        <tr>
                          <th className="text-left p-3 text-slate-400">Date</th>
                          <th className="text-left p-3 text-slate-400">Description</th>
                          <th className="text-right p-3 text-slate-400">Amount</th>
                          <th className="text-left p-3 text-slate-400">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-slate-700/50">
                            <td className="p-3 text-white">{row[mapping.date] || '-'}</td>
                            <td className="p-3 text-white">{row[mapping.description] || '-'}</td>
                            <td className="p-3 text-right text-white">{row[mapping.amount] || '-'}</td>
                            <td className="p-3 text-white">{row[mapping.category] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {importResults && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import Complete</h3>
              <p className="text-slate-400 mb-6">
                Successfully imported {importResults.success} transactions
                {importResults.failed > 0 && `, ${importResults.failed} failed`}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {file && !importResults && (
          <div className="p-6 border-t border-slate-800 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !mapping.description || !mapping.amount}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {isImporting ? 'Importing...' : 'Import Transactions'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
