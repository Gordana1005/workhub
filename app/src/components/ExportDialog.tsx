'use client';

import { useState } from 'react';
import { Download, X, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { exportTasks, exportTimeEntries, exportProjects, exportNotes, ExportFormat } from '@/lib/export';

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
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState(defaultFilename || `${dataType}-export`);

  if (!isOpen) return null;

  const handleExport = () => {
    const options = { format, filename };

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
    { value: 'csv' as ExportFormat, label: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet format (Excel, Google Sheets)' },
    { value: 'json' as ExportFormat, label: 'JSON', icon: FileJson, description: 'Machine-readable format for developers' },
    { value: 'markdown' as ExportFormat, label: 'Markdown', icon: FileText, description: 'Human-readable text format' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg m-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold gradient-text">Export Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Export Format</label>
            <div className="space-y-2">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    format === f.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <f.icon className={`w-5 h-5 mt-0.5 ${format === f.value ? 'text-purple-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="font-semibold">{f.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{f.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-4 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
              placeholder="Enter filename"
            />
            <p className="text-xs text-gray-400 mt-2">
              File extension will be added automatically
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-sm text-gray-300">
              Exporting <span className="font-semibold text-purple-400">{data.length}</span> {dataType.replace('-', ' ')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!filename.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
