import { parseISO } from 'date-fns';

/** Date-only strings ("2026-10-12") and timestamps both become a local Date. */
export function parseDay(value: string): Date {
  return parseISO(value);
}

export interface ProgressSource {
  completion_percentage: number;
  is_completed: boolean;
}

/** Average completion of all milestones (0 when there are none). */
export function planProgress(milestones: ProgressSource[]): number {
  if (milestones.length === 0) return 0;
  const sum = milestones.reduce(
    (total, milestone) => total + (milestone.is_completed ? 100 : milestone.completion_percentage || 0),
    0
  );
  return Math.round(sum / milestones.length);
}

export function isMilestoneOverdue(targetDate: string, isCompleted: boolean, now = new Date()): boolean {
  if (isCompleted) return false;
  const end = parseDay(targetDate);
  end.setHours(23, 59, 59, 999);
  return end < now;
}

export type PlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';

/** Badge variant per plan status (variants come from components/ui/Badge). */
export const STATUS_BADGE: Record<PlanStatus, 'blue' | 'neutral' | 'success' | 'danger'> = {
  active: 'blue',
  draft: 'neutral',
  completed: 'success',
  cancelled: 'danger',
};
