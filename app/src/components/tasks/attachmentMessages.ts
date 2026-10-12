import type { useTranslations } from 'next-intl'
import { MAX_ATTACHMENT_BYTES, formatBytes } from '@/lib/attachments'
import { AttachmentError } from '@/lib/attachments-client'

type Translate = ReturnType<typeof useTranslations>

/** Friendly, translated sentence for a failed upload of `name`. */
export function describeAttachmentError(t: Translate, error: unknown, name: string): string {
  const code = error instanceof AttachmentError ? error.code : 'failed'
  switch (code) {
    case 'tooLarge':
      return t('attErrTooLarge', { name, size: formatBytes(MAX_ATTACHMENT_BYTES) })
    case 'unsupported':
      return t('attErrType', { name })
    case 'empty':
      return t('attErrEmpty', { name })
    case 'network':
      return t('attErrNetwork', { name })
    case 'not_configured':
      return t('attNotSetUpTitle')
    default:
      return t('attErrFailed', { name })
  }
}
