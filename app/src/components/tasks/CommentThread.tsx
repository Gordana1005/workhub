'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';

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
  const { confirm, dialog } = useConfirm();
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
    if (!newComment.trim() || submitting) return;

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
        setComments((prev) => [...prev, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!(await confirm({ title: t('confirmDeleteComment'), confirmLabel: t('deleteComment') }))) return;

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments((prev) => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        {loading ? (
          <p className="py-4 text-center text-sm text-text-muted">{t('loadingComments')}</p>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">{t('noComments')}</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="group flex gap-3">
                <Avatar
                  alt={comment.user?.username || t('unknownUser')}
                  size="sm"
                  className="h-7 w-7 text-[11px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {comment.user?.username || t('unknownUser')}
                    </p>
                    <p className="shrink-0 text-xs text-text-muted">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                    {comment.user_id === currentUserId && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        title={t('deleteComment')}
                        aria-label={t('deleteComment')}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-secondary">{comment.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          rows={1}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
          }}
          placeholder={t('addComment')}
          aria-label={t('addComment')}
          className="max-h-32 min-h-[2.5rem] min-w-0 flex-1 resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          disabled={submitting}
        />
        <Button type="submit" disabled={!newComment.trim() || submitting} className="shrink-0 gap-2" aria-label={t('send')}>
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{submitting ? t('sending') : t('send')}</span>
        </Button>
      </form>
      {dialog}
    </div>
  );
}
