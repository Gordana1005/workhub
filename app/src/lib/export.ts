import Papa from 'papaparse';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'json' | 'markdown';

interface ExportOptions {
  format: ExportFormat;
  filename: string;
}

/**
 * Export tasks to various formats
 */
export function exportTasks(tasks: any[], options: ExportOptions) {
  const formattedTasks = tasks.map(task => ({
    Title: task.title,
    Description: task.description || '',
    Status: task.status,
    Priority: task.priority,
    Category: task.category || '',
    'Due Date': task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    'Created At': format(new Date(task.created_at), 'yyyy-MM-dd HH:mm'),
    'Completed At': task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm') : '',
    Project: task.projects?.name || '',
    'Assigned To': task.assigned_to_user?.full_name || '',
  }));

  switch (options.format) {
    case 'csv':
      exportAsCSV(formattedTasks, options.filename);
      break;
    case 'json':
      exportAsJSON(tasks, options.filename);
      break;
    case 'markdown':
      exportAsMarkdown(formattedTasks, options.filename);
      break;
  }
}

/**
 * Export time entries to various formats
 */
export function exportTimeEntries(entries: any[], options: ExportOptions) {
  const formattedEntries = entries.map(entry => ({
    Task: entry.tasks?.title || 'No Task',
    Project: entry.projects?.name || '',
    Duration: formatDuration(entry.duration),
    'Duration (hours)': (entry.duration / 3600).toFixed(2),
    Date: format(new Date(entry.start_time), 'yyyy-MM-dd'),
    'Start Time': format(new Date(entry.start_time), 'HH:mm'),
    'End Time': entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'In Progress',
    Description: entry.description || '',
  }));

  switch (options.format) {
    case 'csv':
      exportAsCSV(formattedEntries, options.filename);
      break;
    case 'json':
      exportAsJSON(entries, options.filename);
      break;
    case 'markdown':
      exportAsMarkdown(formattedEntries, options.filename);
      break;
  }
}

/**
 * Export projects to various formats
 */
export function exportProjects(projects: any[], options: ExportOptions) {
  const formattedProjects = projects.map(project => ({
    Name: project.name,
    Description: project.description || '',
    Status: project.status,
    'Task Count': project.task_count || 0,
    'Completed Tasks': project.completed_tasks || 0,
    'Created At': format(new Date(project.created_at), 'yyyy-MM-dd'),
  }));

  switch (options.format) {
    case 'csv':
      exportAsCSV(formattedProjects, options.filename);
      break;
    case 'json':
      exportAsJSON(projects, options.filename);
      break;
    case 'markdown':
      exportAsMarkdown(formattedProjects, options.filename);
      break;
  }
}

/**
 * Export notes to various formats
 */
export function exportNotes(notes: any[], options: ExportOptions) {
  const formattedNotes = notes.map(note => ({
    Title: note.title,
    Content: note.content,
    Project: note.projects?.name || 'No Project',
    'Created At': format(new Date(note.created_at), 'yyyy-MM-dd HH:mm'),
    'Updated At': format(new Date(note.updated_at), 'yyyy-MM-dd HH:mm'),
  }));

  switch (options.format) {
    case 'csv':
      exportAsCSV(formattedNotes, options.filename);
      break;
    case 'json':
      exportAsJSON(notes, options.filename);
      break;
    case 'markdown':
      exportAsMarkdown(formattedNotes, options.filename);
      break;
  }
}

// Helper functions

function exportAsCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

function exportAsJSON(data: any[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

function exportAsMarkdown(data: any[], filename: string) {
  if (data.length === 0) {
    downloadFile('No data to export', `${filename}.md`, 'text/markdown');
    return;
  }

  // Create markdown table
  const headers = Object.keys(data[0]);
  let markdown = `# ${filename}\n\n`;
  
  // Table headers
  markdown += `| ${headers.join(' | ')} |\n`;
  markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
  
  // Table rows
  data.forEach(row => {
    markdown += `| ${headers.map(h => row[h] || '').join(' | ')} |\n`;
  });

  downloadFile(markdown, `${filename}.md`, 'text/markdown');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
