'use client'

/**
 * ConfirmDialog + useConfirm: replace window.confirm().
 *
 * <ConfirmDialog open title body? tone?='danger'|'primary'|'default' confirmLabel? cancelLabel?
 *                busy? onConfirm onClose />
 *   - labels default to common.confirm / common.cancel (next-intl), or pass your own
 *   - tone 'danger' (default) = red icon + solid red confirm, focus starts on Cancel (safe)
 *   - `busy` (alias `loading`) shows a spinner on confirm and blocks closing
 *
 * const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: t('deleteConfirm'), confirmLabel: t('delete') }))) return
 *   ...render {dialog} once in the component.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from './Button'
import { Dialog } from './Dialog'

export type ConfirmTone = 'danger' | 'primary' | 'default'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy = false,
  loading = false,
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  loading?: boolean
  tone?: ConfirmTone
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useTranslations('common')
  const working = busy || loading
  const danger = tone === 'danger'

  return (
    <Dialog
      open={open}
      title={title}
      size="sm"
      onClose={working ? () => {} : onClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={working}
            data-autofocus={danger ? true : undefined}
          >
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button
            type="button"
            variant={danger ? 'destructive' : 'primary'}
            className="w-full sm:w-auto"
            onClick={onConfirm}
            loading={working}
            data-autofocus={danger ? undefined : true}
          >
            {confirmLabel ?? t('confirm')}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {danger ? (
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
        ) : null}
        {body ? <div className="min-w-0 flex-1 self-center text-sm leading-6 text-text-secondary">{body}</div> : null}
      </div>
    </Dialog>
  )
}

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

/** Promise-based window.confirm replacement. Render the returned `dialog` once. */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setState((current) => (current ? { ...current, open: false } : current))
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setState({ ...options, open: true })
    })
  }, [])

  const dialog = state ? (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      body={state.body}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      tone={state.tone}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  ) : null

  return { confirm, dialog }
}
