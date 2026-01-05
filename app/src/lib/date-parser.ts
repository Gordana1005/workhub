import * as chrono from 'chrono-node';
import { format } from 'date-fns';

export interface ParsedDate {
  date: Date;
  text: string;
  formatted: string;
}

/**
 * Parse natural language date strings like "tomorrow at 3pm", "next monday", "in 2 days"
 */
export function parseNaturalDate(input: string): ParsedDate | null {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const results = chrono.parse(input);
  
  if (results.length === 0) {
    return null;
  }

  const result = results[0];
  const date = result.start.date();

  return {
    date,
    text: result.text,
    formatted: format(date, 'MMM dd, yyyy')
  };
}

/**
 * Extract date from task title and return cleaned title + parsed date
 * Example: "Buy groceries tomorrow" -> { title: "Buy groceries", date: Date }
 */
export function extractDateFromText(text: string): { title: string; date: Date | null; dateText: string | null } {
  const parsed = parseNaturalDate(text);
  
  if (!parsed) {
    return { title: text, date: null, dateText: null };
  }

  // Remove the date text from the title
  const cleanedTitle = text.replace(parsed.text, '').trim();

  return {
    title: cleanedTitle || text, // Fallback to original if cleaning removes everything
    date: parsed.date,
    dateText: parsed.text
  };
}

/**
 * Common date shortcuts for quick selection
 */
export const dateShortcuts = [
  { label: 'Today', value: () => new Date() },
  { label: 'Tomorrow', value: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }},
  { label: 'Next Week', value: () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }},
  { label: 'Next Month', value: () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }},
];

/**
 * Format date in relative terms (today, tomorrow, in 3 days)
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return format(date, 'MMM dd, yyyy');
}
