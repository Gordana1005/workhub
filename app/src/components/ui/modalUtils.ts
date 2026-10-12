/**
 * Shared plumbing for modal surfaces (Dialog, BottomSheet): ref-counted body scroll lock,
 * a "modal open" flag on <html> (so the toast region can move out of the way), and focus helpers.
 */

let lockCount = 0
let savedOverflow = ''

export function lockScroll() {
  if (lockCount++ === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.setAttribute('data-modal', '')
  }
}

export function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0
    document.body.style.overflow = savedOverflow
    document.documentElement.removeAttribute('data-modal')
  }
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'

export function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('data-dialog-skip') && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  )
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Keep the focused field visible above the on-screen keyboard (call from a focusin handler). */
export function revealFocused(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return
  if (!target.matches('input,textarea,select,[contenteditable="true"]')) return
  // wait for the keyboard / visual viewport resize to settle, then centre the field
  window.setTimeout(() => {
    if (document.activeElement !== target) return
    target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, 280)
}
