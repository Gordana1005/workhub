'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Pencil, Send, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { IconMenu } from '@/components/ui/IconMenu';
import { useToast } from '@/components/ui/Toast';
import { announceAttachmentsChanged, uploadTaskAttachment } from '@/lib/attachments-client';
import { pastedImageName } from '@/lib/attachments';
import { tokenizeComment } from '@/lib/mentions';
import MentionTextarea from './MentionTextarea';
import { describeAttachmentError } from './attachmentMessages';
import type { MemberOption } from './types';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  user: {
    id: string;
    username: string;
  } | null;
  user_id: string;
}

interface CommentThreadProps {
  taskId: string;
  currentUserId: string;
  /** Workspace members: avatars, @mention suggestions and mention chips. */
  members?: MemberOption[];
  /** Needed for pasting images into the composer (they are attached to the task). */
  workspaceId?: string;
  /** Reports the number of comments (for the tab badge). */
  onCount?: (count: number) => void;
}

const MAX_LENGTH = 5000;

/** A comment edited more than a few seconds after it was posted shows "edited". */
function wasEdited(comment: Comment) {
  if (!comment.updated_at) return false;
  const created = new Date(comment.created_at).getTime();
  const updated = new Date(comment.updated_at).getTime();
  return Number.isFinite(created) && Number.isFinite(updated) && updated - created > 5000;
}

/** Comment text as plain React text with @mention chips (never HTML). */
function CommentBody({ content, members, currentUserId, mentionsYou }: {
  content: string;
  members: MemberOption[];
  currentUserId: string;
  mentionsYou: string;
}) {
  const tokens = useMemo(() => tokenizeComment(content, members), [content, members]);
  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
      {tokens.map((token, index) => {
        if (token.type === 'text') return <span key={index}>{token.text}</span>;
        const mine = token.userId === currentUserId;
        return (
          <Link
            key={index}
            href="/dashboard/team"
            className={`rounded-md px-1 py-0.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mine
                ? 'bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/25'
                : 'bg-primary/10 text-primary hover:bg-primary/15'
            }`}
          >
            {token.text}
            {mine ? <span className="sr-only"> ({mentionsYou})</span> : null}
          </Link>
        );
      })}
    </p>
  );
}

/**
 * Comments list + composer. The root fills its parent; the composer sticks to the bottom of the
 * scrolling column (above the on-screen keyboard on phones).
 */
export default function CommentThread({ taskId, currentUserId, members = [], workspaceId, onCount }: CommentThreadProps) {
  const t = useTranslations('pages.tasks');
  const format = useFormatter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const avatarFor = useCallback(
    (userId?: string) => members.find((member) => member.id === userId)?.avatar_url ?? null,
    [members]
  );
  const me = members.find((member) => member.id === currentUserId);
  const isAdmin = me?.role === 'admin' || me?.role === 'owner';

  // relative timestamps stay fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const relative = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return format.relativeTime(date, now < date ? date : now);
  };

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comments?taskId=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data) ? data : []);
        onCountRef.current?.(Array.isArray(data) ? data.length : 0);
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

  const setList = (updater: (prev: Comment[]) => Comment[]) => {
    setComments((prev) => {
      const next = updater(prev);
      onCountRef.current?.(next.length);
      return next;
    });
  };

  const errorMessage = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => null);
    return payload?.code === 'not_configured' ? t('commentUnavailable') : fallback;
  };

  const handleSubmit = async () => {
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
        setList((prev) => [...prev, comment]);
        setNewComment('');
      } else {
        toast.error(await errorMessage(response, t('commentPostFailed')));
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error(t('commentPostFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    // stored text escapes a stray "<"; edit it as it was typed
    setEditText(comment.content.replace(/&lt;/g, '<'));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    const id = editingId;
    if (!id || savingEdit) return;
    const text = editText.trim();
    if (!text) return;
    const original = comments.find((c) => c.id === id);
    if (original && text === original.content.replace(/&lt;/g, '<').trim()) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: text })
      });
      if (response.ok) {
        const updated = await response.json();
        setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
        cancelEdit();
      } else {
        toast.error(await errorMessage(response, t('commentEditFailed')));
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
      toast.error(t('commentEditFailed'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!(await confirm({ title: t('confirmDeleteComment'), confirmLabel: t('deleteComment') }))) return;

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setList((prev) => prev.filter((c) => c.id !== commentId));
        if (editingId === commentId) cancelEdit();
      } else {
        toast.error(await errorMessage(response, t('commentDeleteFailed')));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error(t('commentDeleteFailed'));
    }
  };

  // Pasted screenshots become attachments of the task
  const handlePasteFiles = workspaceId
    ? async (files: File[]) => {
        for (const original of files) {
          const file = new File([original], pastedImageName(original.type), { type: original.type });
          try {
            await uploadTaskAttachment({ workspaceId, taskId, file });
            announceAttachmentsChanged(taskId);
            toast.success(t('commentImageAttached'));
          } catch (error) {
            toast.error(describeAttachmentError(t, error, file.name) || t('commentPasteFailed'));
          }
        }
      }
    : undefined;

  const menuButtonClass =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover aria-expanded:opacity-100 sm:h-8 sm:w-8 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 pb-4">
        {loading && comments.length === 0 ? (
          <div className="space-y-4" aria-busy="true" aria-label={t('loadingComments')}>
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton h-8 w-8 shrink-0 !rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{t('noComments')}</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const author = comment.user?.username || t('unknownUser');
              const own = comment.user_id === currentUserId;
              const editing = editingId === comment.id;
              const mentionsMe = tokenizeComment(comment.content, members).some(
                (token) => token.type === 'mention' && token.userId === currentUserId
              );
              const items = [
                ...(own
                  ? [{ label: t('commentEdit'), icon: <Pencil />, onClick: () => startEdit(comment) }]
                  : []),
                ...(own || isAdmin
                  ? [{
                      label: t('deleteComment'),
                      icon: <Trash2 />,
                      onClick: () => handleDelete(comment.id),
                      danger: true,
                      separatorBefore: own,
                    }]
                  : []),
              ];
              return (
                <li
                  key={comment.id}
                  className={`group flex gap-3 ${mentionsMe ? '-mx-2 rounded-xl bg-primary/5 px-2 py-2' : ''}`}
                >
                  <Avatar alt={author} src={avatarFor(comment.user_id)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">{author}</p>
                      <p className="shrink-0 text-xs text-text-muted">{relative(comment.created_at)}</p>
                      {wasEdited(comment) ? (
                        <p
                          className="shrink-0 text-xs text-text-muted"
                          title={t('commentEditedTitle', { time: relative(comment.updated_at) })}
                        >
                          · {t('commentEdited')}
                        </p>
                      ) : null}
                      {items.length > 0 && !editing ? (
                        <span className="-my-1.5 ml-auto shrink-0">
                          <IconMenu label={t('commentActions')} items={items} buttonClassName={menuButtonClass} />
                        </span>
                      ) : null}
                    </div>
                    {editing ? (
                      <div className="mt-1.5 space-y-2">
                        <MentionTextarea
                          value={editText}
                          onChange={setEditText}
                          members={members}
                          placeholder={t('commentPlaceholder')}
                          ariaLabel={t('commentEdit')}
                          disabled={savingEdit}
                          autoFocus
                          maxLength={MAX_LENGTH}
                          onSubmit={saveEdit}
                          onEscape={cancelEdit}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                            {t('cancel')}
                          </Button>
                          <Button size="sm" onClick={saveEdit} loading={savingEdit} disabled={!editText.trim()}>
                            {t('commentSaveEdit')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CommentBody
                        content={comment.content}
                        members={members}
                        currentUserId={currentUserId}
                        mentionsYou={t('commentMentionsYou')}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="sticky bottom-0 z-10 -mx-4 mt-auto flex items-end gap-2 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6 sm:pb-3"
      >
        <Avatar
          alt={me?.username || t('you')}
          src={me?.avatar_url}
          size="sm"
          className="mb-1 hidden sm:inline-flex"
        />
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          members={members}
          placeholder={t('commentPlaceholder')}
          ariaLabel={t('addComment')}
          disabled={submitting}
          maxLength={MAX_LENGTH}
          onSubmit={handleSubmit}
          onPasteFiles={handlePasteFiles}
          onFocus={(e) => {
            const el = e.currentTarget;
            window.setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 300);
          }}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          aria-label={t('send')}
          title={`${t('send')} (Ctrl+Enter)`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-btn-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 sm:h-10 sm:w-10"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {dialog}
    </div>
  );
}
