import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, getDay, setDate } from 'date-fns';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  endDate?: Date | null;
  weekDays?: number[]; // 0-6, Sunday-Saturday
  monthDay?: number; // 1-31
}

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
export function getNextOccurrence(
  currentDate: Date,
  pattern: RecurrencePattern
): Date | null {
  if (pattern.endDate && isAfter(currentDate, pattern.endDate)) {
    return null; // Recurrence has ended
  }

  let nextDate: Date;

  switch (pattern.type) {
    case 'daily':
      nextDate = addDays(currentDate, pattern.interval);
      break;

    case 'weekly':
      nextDate = addWeeks(currentDate, pattern.interval);
      
      // If specific week days are set, find the next matching day
      if (pattern.weekDays && pattern.weekDays.length > 0) {
        const currentDay = getDay(nextDate);
        const sortedDays = [...pattern.weekDays].sort();
        
        // Find next day in the pattern
        let daysToAdd = 0;
        for (const targetDay of sortedDays) {
          if (targetDay > currentDay) {
            daysToAdd = targetDay - currentDay;
            break;
          }
        }
        
        // If no future day this week, go to first day next week
        if (daysToAdd === 0) {
          daysToAdd = (7 - currentDay) + sortedDays[0];
        }
        
        nextDate = addDays(currentDate, daysToAdd);
      }
      break;

    case 'monthly':
      nextDate = addMonths(currentDate, pattern.interval);
      
      // If specific month day is set
      if (pattern.monthDay) {
        nextDate = setDate(nextDate, Math.min(pattern.monthDay, 31));
      }
      break;

    case 'yearly':
      nextDate = addYears(currentDate, pattern.interval);
      break;

    default:
      nextDate = addDays(currentDate, pattern.interval);
  }

  // Check if next occurrence exceeds end date
  if (pattern.endDate && isAfter(nextDate, pattern.endDate)) {
    return null;
  }

  return nextDate;
}

/**
 * Generate a series of occurrences up to a limit
 */
export function generateOccurrences(
  startDate: Date,
  pattern: RecurrencePattern,
  limit: number = 10
): Date[] {
  const occurrences: Date[] = [startDate];
  let currentDate = startDate;

  for (let i = 0; i < limit - 1; i++) {
    const nextDate = getNextOccurrence(currentDate, pattern);
    if (!nextDate) break;
    
    occurrences.push(nextDate);
    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Check if a task should recur on a specific date
 */
export function shouldRecurOnDate(
  date: Date,
  startDate: Date,
  pattern: RecurrencePattern
): boolean {
  if (isBefore(date, startDate)) return false;
  if (pattern.endDate && isAfter(date, pattern.endDate)) return false;

  const occurrences = generateOccurrences(startDate, pattern, 100);
  return occurrences.some(occurrence => 
    occurrence.toDateString() === date.toDateString()
  );
}

/**
 * Convert RecurrencePattern to cron-like expression for storage
 */
export function patternToCronExpression(pattern: RecurrencePattern): string {
  const parts: string[] = [];
  
  parts.push(pattern.type);
  parts.push(pattern.interval.toString());
  
  if (pattern.weekDays && pattern.weekDays.length > 0) {
    parts.push(`weekdays:${pattern.weekDays.join(',')}`);
  }
  
  if (pattern.monthDay) {
    parts.push(`monthday:${pattern.monthDay}`);
  }
  
  if (pattern.endDate) {
    parts.push(`end:${pattern.endDate.toISOString()}`);
  }
  
  return parts.join('|');
}

/**
 * Parse cron-like expression back to RecurrencePattern
 */
export function parseCronExpression(expression: string): RecurrencePattern {
  const parts = expression.split('|');
  const pattern: RecurrencePattern = {
    type: parts[0] as any,
    interval: parseInt(parts[1]) || 1,
  };
  
  parts.slice(2).forEach(part => {
    if (part.startsWith('weekdays:')) {
      pattern.weekDays = part.substring(9).split(',').map(d => parseInt(d));
    } else if (part.startsWith('monthday:')) {
      pattern.monthDay = parseInt(part.substring(9));
    } else if (part.startsWith('end:')) {
      pattern.endDate = new Date(part.substring(4));
    }
  });
  
  return pattern;
}

/**
 * Create a new task instance for a recurring task
 */
export async function createRecurringTaskInstance(
  originalTask: any,
  nextDueDate: Date,
  supabaseClient: any
) {
  const { data: newTask, error } = await supabaseClient
    .from('tasks')
    .insert({
      workspace_id: originalTask.workspace_id,
      project_id: originalTask.project_id,
      title: originalTask.title,
      description: originalTask.description,
      priority: originalTask.priority,
      category: originalTask.category,
      due_date: nextDueDate.toISOString(),
      assignee_id: originalTask.assignee_id,
      creator_id: originalTask.creator_id,
      is_recurring: true,
      recurrence_pattern: originalTask.recurrence_pattern,
      recurrence_interval: originalTask.recurrence_interval,
      recurrence_end_date: originalTask.recurrence_end_date,
      parent_task_id: originalTask.id, // Link to original task
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create recurring task instance:', error);
    return null;
  }

  return newTask;
}
