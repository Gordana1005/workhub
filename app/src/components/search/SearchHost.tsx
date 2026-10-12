'use client'

/**
 * SearchHost - mounts the global SearchPalette and opens it from Ctrl/Cmd+K, "/" (outside text fields) or a
 * `trackwork:open-search` window event (used by the onboarding checklist). Mount it once, inside the dashboard layout.
 */
import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { CreateKind } from '@/components/shell/NewMenu'

const SearchPalette = dynamic(() => import('@/components/search/SearchPalette'), { ssr: false })

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export default function SearchHost({ onCreate }: { onCreate: (kind: CreateKind) => void }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      const cmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)
      if (!cmdK && !slash) return
      event.preventDefault()
      setOpen((value) => (cmdK ? !value : true))
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('trackwork:open-search', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('trackwork:open-search', onOpen)
    }
  }, [])

  // Only mount once it has been opened; the palette resets its own state on every open.
  const [everOpened, setEverOpened] = useState(false)
  useEffect(() => {
    if (open) setEverOpened(true)
  }, [open])

  return everOpened ? <SearchPalette open={open} onClose={close} onCreate={onCreate} /> : null
}
