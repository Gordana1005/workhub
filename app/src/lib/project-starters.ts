export type StarterId = 'blank' | 'client' | 'product' | 'internal' | 'personal' | 'event'

// Task titles live in the message catalogs (pages.projects.starters.<id>.<n>), so a starter is just
// a number of steps. Keep these counts in sync with the catalogs.
const STARTER_STEPS: Record<StarterId, number> = {
  blank: 0,
  client: 5,
  product: 5,
  internal: 5,
  personal: 5,
  event: 5,
}

/** Message keys (relative to pages.projects.starters) for a starter's tasks, in natural order. */
export function starterTaskKeys(id: StarterId): string[] {
  const steps = STARTER_STEPS[id] ?? 0
  return Array.from({ length: steps }, (_, index) => `${id}.${index + 1}`)
}

export const PROJECT_COLORS = [
  '#667eea',
  '#4facfe',
  '#43e97b',
  '#feca57',
  '#fa709a',
  '#ff6b6b',
  '#4ecdc4',
  '#f093fb',
] as const

/** A stable colour for a project name, so new projects do not all look identical. */
export function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}
