'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
  };
  user_id: string;
}

interface CommentThreadProps {
  taskId: string;
  currentUserId: string;
}

export default function CommentThread({ taskId, currentUserId }: CommentThreadProps) {
  const t = useTranslations('pages.tasks');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comments?taskId=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [taskId, loadComments]);

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          content: newComment
        })
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(t('confirmDeleteComment'))) return;

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <MessageSquare className="w-4 h-4" />
        <span>{t('commentsCount', { count: comments.length })}</span>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-text-secondary text-center py-4">{t('loadingComments')}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">{t('noComments')}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-surface-hover p-3 rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{comment.user.username}</p>
                    <p className="text-xs text-text-secondary">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </div>
                {comment.user_id === currentUserId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="shrink-0 p-2 hover:bg-danger/10 text-danger rounded transition-colors"
                    title={t('deleteComment')}
                    aria-label={t('deleteComment')}
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
          placeholder={t('addComment')}
          className="min-w-0 flex-1 px-4 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none text-sm"
          disabled={submitting}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 text-white"
        >
          <Send className="w-4 h-4" />
          {submitting ? t('sending') : t('send')}
        </button>
      </div>
    </div>
  );
}
