'use client'

import { useEffect, useState } from 'react'

// Categorical series colours, fixed order. Light and dark steps come from the same hues,
// stepped for each surface so both themes keep their contrast.
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

export function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

export function useSeriesColors() {
  return useIsDark() ? SERIES_DARK : SERIES_LIGHT
}

/** Neutral used for the folded "other" slice. Uses a theme token so it reads in both themes. */
export const OTHER_COLOR = 'var(--text-muted)'

export const axisTick = { fontSize: 11, fill: 'var(--text-secondary)' }

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  payload?: { fill?: string }
}

/** Recharts tooltip content that follows the theme tokens. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  formatValue?: (value: number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-text-primary shadow-md">
      {label ? <p className="mb-1 text-xs font-semibold text-text-secondary">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span className="text-text-secondary">{entry.name}</span>
          <span className="font-semibold tabular-nums">
            {formatValue ? formatValue(Number(entry.value)) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}
