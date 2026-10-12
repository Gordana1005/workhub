'use client'

/**
 * useSheetDrag: swipe-down-to-close for bottom sheets (touch / pen only, never mouse).
 *   const drag = useSheetDrag(onClose)
 *   <div style={drag.style} className="animate-sheet-in ...">          // the sheet panel
 *     <div {...drag.handleProps}>grab handle + title area</div>        // drag starts here only
 *     <div className="overflow-y-auto">...</div>                       // content scrolls normally
 *   </div>
 * - Uses the independent `translate` property, so it composes with the `transform` based
 *   enter/exit animations. Release past ~96px (or a quick flick) closes; otherwise it springs back.
 * - If `onClose` does not actually close the sheet (e.g. a busy confirm), the sheet springs back.
 * - `phoneOnly`: ignore drags at >= 640px (for dialogs that are centred panels there).
 * - Interactive children (button/a/input/...) inside the handle zone keep working: drags that
 *   start on them are ignored.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

const CLOSE_DISTANCE = 96
const FLICK_SPEED = 0.55 // px per ms
const INTERACTIVE = 'button,a,input,select,textarea,[role="button"],[role="menuitem"],[role="tab"]'

export function useSheetDrag(onClose: () => void, enabled = true, phoneOnly = false) {
  const [y, setY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ y: number; time: number; id: number } | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  const reset = useCallback(() => {
    start.current = null
    setDragging(false)
    setY(0)
  }, [])

  const finish = useCallback(
    (clientY: number, element: HTMLElement) => {
      const s = start.current
      start.current = null
      setDragging(false)
      if (!s) return
      const dy = Math.max(0, clientY - s.y)
      const speed = dy / Math.max(1, performance.now() - s.time)
      if (dy > CLOSE_DISTANCE || (dy > 36 && speed > FLICK_SPEED)) {
        const sheet = element.closest<HTMLElement>('[data-sheet]')
        setY(sheet ? sheet.offsetHeight : window.innerHeight)
        timers.current.push(window.setTimeout(() => onCloseRef.current(), 140))
        // still mounted a moment later = the owner refused to close: come back
        timers.current.push(window.setTimeout(() => setY(0), 420))
      } else {
        setY(0)
      }
    },
    []
  )

  const handleProps = {
    style: { touchAction: 'none' } as CSSProperties,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.pointerType === 'mouse' || event.button !== 0) return
      if (phoneOnly && window.innerWidth >= 640) return // centred dialog on tablets: nothing to swipe
      if ((event.target as HTMLElement).closest(INTERACTIVE)) return
      start.current = { y: event.clientY, time: performance.now(), id: event.pointerId }
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // capture is a nicety; dragging still works without it
      }
      setDragging(true)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== event.pointerId) return
      setY(Math.max(0, event.clientY - s.y))
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (start.current?.id === event.pointerId) finish(event.clientY, event.currentTarget)
    },
    onPointerCancel: () => reset(),
  }

  const style: CSSProperties = {
    translate: y ? `0 ${y}px` : undefined,
    transition: dragging ? 'none' : 'translate 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  }

  return { handleProps, style, dragging, reset }
}
