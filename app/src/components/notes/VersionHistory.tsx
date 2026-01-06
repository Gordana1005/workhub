'use client';

import { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

export default function VersionHistory({
  noteId,
  currentContent,
  currentTitle,
  onRestore,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [noteId]);

  const loadVersions = async () => {
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
  };

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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="card w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-purple-500" />
            Version History
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Versions List */}
          <div className="w-80 border-r border-white/10 overflow-y-auto">
            <div className="p-4">
              {/* Current Version */}
              <button
                onClick={() => setSelectedVersion(null)}
                className={`w-full text-left p-4 rounded-xl mb-2 transition-colors ${
                  !selectedVersion
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">Current Version</span>
                </div>
                <p className="text-sm opacity-80">
                  {stripHtml(currentContent).slice(0, 100)}...
                </p>
              </button>

              {/* Version List */}
              {loading ? (
                <div className="text-center py-8 text-slate-400">
                  Loading versions...
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No previous versions</p>
                </div>
              ) : (
                versions.map(version => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`w-full text-left p-4 rounded-xl mb-2 transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">
                        Version {version.version_number}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    <p className="text-sm opacity-80 line-clamp-2">
                      {stripHtml(version.content).slice(0, 80)}...
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-8">
            {selectedVersion ? (
              <div>
                <div className="mb-6">
                  <h1 className="text-4xl font-bold mb-2">{selectedVersion.title}</h1>
                  <p className="text-slate-400">
                    Version {selectedVersion.version_number} • {formatDate(selectedVersion.created_at)}
                  </p>
                </div>
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                />
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h1 className="text-4xl font-bold mb-2">{currentTitle}</h1>
                  <p className="text-slate-400">Current Version</p>
                </div>
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentContent }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          {selectedVersion && (
            <button
              onClick={handleRestore}
              className="btn-primary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restore This Version
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
