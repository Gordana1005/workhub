export type StarterId = 'blank' | 'client' | 'product' | 'internal' | 'personal'

const STARTERS: Record<StarterId, { title: string }[]> = {
  blank: [],
  client: [
    { title: 'Kickoff' },
    { title: 'Collect materials' },
    { title: 'First draft' },
    { title: 'Review' },
    { title: 'Deliver' },
  ],
  product: [
    { title: 'Define the problem' },
    { title: 'Sketch the flow' },
    { title: 'Build the first slice' },
    { title: 'Test it' },
    { title: 'Ship' },
  ],
  internal: [
    { title: 'Set the goal' },
    { title: 'Plan the work' },
    { title: 'Do the work' },
    { title: 'Team review' },
    { title: 'Close out' },
  ],
  personal: [
    { title: 'Set the outcome' },
    { title: 'List the steps' },
    { title: 'First step' },
    { title: 'Check progress' },
    { title: 'Finish' },
  ],
}

export function starterTasks(id: StarterId): { title: string }[] {
  const tasks = STARTERS[id]
  if (!tasks) return []
  return tasks.map((task) => ({ title: task.title }))
}
