// Supabase Edge Function: Generate Recurring Tasks
// Runs daily at midnight UTC via cron schedule
// Queries tasks with recurrence patterns and generates instances

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  due_date: string | null
  estimated_hours: number | null
  category: string | null
  tags: string[] | null
  workspace_id: string
  project_id: string | null
  assigned_to: string | null
  created_by: string
  recurrence_pattern: string // daily, weekly, monthly, yearly
  recurrence_end_date: string | null
  parent_task_id: string | null
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval?: number // e.g., every 2 days, every 3 weeks
  daysOfWeek?: number[] // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number // For monthly recurrence
  monthOfYear?: number // For yearly recurrence
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    // @ts-ignore - Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore - Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    const todayStr = today.toISOString().split('T')[0]

    console.log(`[${new Date().toISOString()}] Starting recurring task generation for ${todayStr}`)

    // Query all active recurring tasks
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .not('recurrence_pattern', 'is', null)
      .eq('status', 'active') // Only generate from active templates
      .is('parent_task_id', null) // Only template tasks, not instances
      .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${todayStr}`)

    if (fetchError) {
      throw new Error(`Failed to fetch recurring tasks: ${fetchError.message}`)
    }

    if (!recurringTasks || recurringTasks.length === 0) {
      console.log('No recurring tasks found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recurring tasks to generate',
          generated: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Found ${recurringTasks.length} recurring task templates`)

    const tasksToGenerate: Partial<Task>[] = []
    const errors: string[] = []

    // Process each recurring task
    for (const task of recurringTasks as Task[]) {
      try {
        const shouldGenerate = shouldGenerateTaskToday(
          task.recurrence_pattern,
          task.due_date,
          today
        )

        if (shouldGenerate) {
          // Check if instance already exists for today
          const { data: existingInstance } = await supabase
            .from('tasks')
            .select('id')
            .eq('parent_task_id', task.id)
            .gte('created_at', todayStr)
            .lt('created_at', `${todayStr}T23:59:59.999Z`)
            .single()

          if (existingInstance) {
            console.log(`Task instance already exists for ${task.title} (${task.id})`)
            continue
          }

          // Calculate new due date
          const newDueDate = calculateNewDueDate(
            task.due_date,
            task.recurrence_pattern,
            today
          )

          // Create new task instance
          const newTask: Partial<Task> = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: 'todo', // New instances start as todo
            due_date: newDueDate,
            estimated_hours: task.estimated_hours,
            category: task.category,
            tags: task.tags,
            workspace_id: task.workspace_id,
            project_id: task.project_id,
            assigned_to: task.assigned_to,
            created_by: task.created_by,
            parent_task_id: task.id, // Link to template task
            recurrence_pattern: undefined, // Instances don't recur themselves
            recurrence_end_date: undefined
          }

          tasksToGenerate.push(newTask)
          console.log(`Scheduled generation for: ${task.title}`)
        }
      } catch (error) {
        const errorMsg = `Error processing task ${task.id}: ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    // Bulk insert generated tasks
    let generatedCount = 0
    if (tasksToGenerate.length > 0) {
      const { data: insertedTasks, error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToGenerate)
        .select('id, title')

      if (insertError) {
        throw new Error(`Failed to insert tasks: ${insertError.message}`)
      }

      generatedCount = insertedTasks?.length || 0
      console.log(`Successfully generated ${generatedCount} task instances`)
      
      if (insertedTasks) {
        insertedTasks.forEach((task: { id: string; title: string }) => {
          console.log(`  - ${task.title} (${task.id})`)
        })
      }
    }

    const response = {
      success: true,
      message: `Generated ${generatedCount} recurring task instances`,
      generated: generatedCount,
      templates_processed: recurringTasks.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log(`[${new Date().toISOString()}] Completed: ${JSON.stringify(response)}`)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Determine if a task should be generated today based on recurrence pattern
 */
function shouldGenerateTaskToday(
  pattern: string,
  originalDueDate: string | null,
  today: Date
): boolean {
  try {
    const recurrence: RecurrencePattern = JSON.parse(pattern)
    const interval = recurrence.interval || 1

    switch (recurrence.frequency) {
      case 'daily':
        // Generate every N days
        if (!originalDueDate) return true
        
        const daysSinceStart = Math.floor(
          (today.getTime() - new Date(originalDueDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSinceStart % interval === 0

      case 'weekly':
        // Generate on specific days of the week
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          const todayDayOfWeek = today.getDay()
          return recurrence.daysOfWeek.includes(todayDayOfWeek)
        }
        // Fallback: generate on same day as original due date
        if (originalDueDate) {
          const originalDay = new Date(originalDueDate).getDay()
          return today.getDay() === originalDay
        }
        return false

      case 'monthly':
        // Generate on specific day of month
        const dayOfMonth = recurrence.dayOfMonth || (originalDueDate ? new Date(originalDueDate).getDate() : 1)
        return today.getDate() === dayOfMonth

      case 'yearly':
        // Generate on specific month and day
        if (!originalDueDate) return false
        
        const original = new Date(originalDueDate)
        return today.getMonth() === original.getMonth() && 
               today.getDate() === original.getDate()

      default:
        console.warn(`Unknown recurrence frequency: ${recurrence.frequency}`)
        return false
    }
  } catch (error) {
    console.error('Error parsing recurrence pattern:', error)
    return false
  }
}

/**
 * Calculate the new due date for a generated task instance
 */
function calculateNewDueDate(
  originalDueDate: string | null,
  pattern: string,
  today: Date
): string | null {
  if (!originalDueDate) return null

  try {
    const recurrence: RecurrencePattern = JSON.parse(pattern)
    const original = new Date(originalDueDate)
    const interval = recurrence.interval || 1

    // Preserve the time component from original due date
    const hours = original.getHours()
    const minutes = original.getMinutes()

    const newDate = new Date(today)
    newDate.setHours(hours, minutes, 0, 0)

    switch (recurrence.frequency) {
      case 'daily':
        // Due date is today + time offset
        return newDate.toISOString()

      case 'weekly':
        // Due date is today (already matches day of week)
        return newDate.toISOString()

      case 'monthly':
        // Due date is today (already matches day of month)
        return newDate.toISOString()

      case 'yearly':
        // Due date is today (already matches month and day)
        return newDate.toISOString()

      default:
        return newDate.toISOString()
    }
  } catch (error) {
    console.error('Error calculating new due date:', error)
    // Fallback: return today with same time as original
    const original = new Date(originalDueDate)
    const newDate = new Date(today)
    newDate.setHours(original.getHours(), original.getMinutes(), 0, 0)
    return newDate.toISOString()
  }
}

/* For testing locally:
// deno run --allow-net --allow-env index.ts
*/
