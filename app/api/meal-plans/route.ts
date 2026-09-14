import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'default_user'
    const date = searchParams.get('date')

    let query = supabase
      .from('meal_plans')
      .select(`
        id, user_id, recipe_id, meal_type, planned_date, planned_time, servings, status, created_at,
        recipes (
          id, name, title, description, image_url, meal_type, category, cuisine, diet_type,
          prep_time_minutes, cook_time_minutes, total_time_minutes, difficulty,
          calories, nutrition_score, ingredients
        )
      `)
      .eq('user_id', userId)
      .order('planned_date', { ascending: true })
      .order('planned_time', { ascending: true })

    if (date) {
      query = query.eq('planned_date', date)
    }

    const { data: plans, error } = await query

    if (error) {
      console.error('[Meal Plans GET Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also fetch associated user_preparation_tasks
    const planIds = (plans || []).map(p => p.id)
    let prepTasks: any[] = []
    if (planIds.length > 0) {
      const { data: tasks } = await supabase
        .from('user_preparation_tasks')
        .select('*')
        .in('meal_plan_id', planIds)
        .order('scheduled_at', { ascending: true })
      prepTasks = tasks || []
    }

    // Combine plans with their calculated tasks
    const plansWithTasks = (plans || []).map(p => ({
      ...p,
      tasks: prepTasks.filter(t => t.meal_plan_id === p.id),
    }))

    return NextResponse.json({ plans: plansWithTasks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      recipe_id,
      meal_type = 'dinner',
      planned_date = new Date().toISOString().split('T')[0],
      planned_time = '20:00', // e.g. 8:00 PM
      servings = 4,
      user_id = 'default_user',
    } = body

    if (!recipe_id) {
      return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })
    }

    // 1. Fetch recipe details & prep tasks
    const { data: recipe, error: recError } = await supabase
      .from('recipes')
      .select('id, name, title, prep_time_minutes, cook_time_minutes, total_time_minutes')
      .eq('id', recipe_id)
      .single()

    if (recError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const recipeName = recipe.name || recipe.title || 'Delicious Meal'
    const cookMinutes = recipe.cook_time_minutes || 25
    const prepMinutes = recipe.prep_time_minutes || 15

    // 2. Create or replace this user's meal slot. A slot is intentionally unique.
    const { data: newPlan, error: planError } = await supabase
      .from('meal_plans')
      .upsert({
        user_id,
        recipe_id,
        meal_type,
        planned_date,
        planned_time,
        servings,
        status: 'planned',
      }, { onConflict: 'user_id,planned_date,meal_type' })
      .select()
      .single()

    if (planError || !newPlan) {
      console.error('[Create Plan Error]:', planError)
      return NextResponse.json({ error: planError?.message || 'Failed to create plan' }, { status: 500 })
    }

    // Rebuilding a replaced slot must not leave stale or duplicate prep records.
    await Promise.all([
      supabase.from('user_preparation_tasks').delete().eq('meal_plan_id', newPlan.id),
      supabase.from('notifications').delete().eq('meal_plan_id', newPlan.id),
    ])

    // 3. Automatic Preparation Calculation
    // Parse planned_date and planned_time to calculate exact scheduled_at timestamps
    const [hours, minutes] = planned_time.split(':').map(Number)
    const targetMealTime = new Date(`${planned_date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)

    // Start cooking time = targetMealTime - cookMinutes
    const startCookingTime = new Date(targetMealTime.getTime() - cookMinutes * 60 * 1000)

    // Fetch preparation tasks for this recipe
    const { data: templateTasks } = await supabase
      .from('recipe_preparation_tasks')
      .select('*')
      .eq('recipe_id', recipe_id)
      .order('sequence', { ascending: true })

    const prepTasksToInsert = []
    const notificationsToInsert = []

    if (templateTasks && templateTasks.length > 0) {
      let cumulativeOffset = 0
      // Calculate backwards from cooking start
      for (const t of templateTasks.slice().reverse()) {
        const duration = t.duration_minutes || 15
        cumulativeOffset += duration
        const taskScheduleTime = new Date(startCookingTime.getTime() - cumulativeOffset * 60 * 1000)

        prepTasksToInsert.push({
          user_id,
          meal_plan_id: newPlan.id,
          recipe_task_id: t.id,
          task_name: t.task_name,
          description: t.description || `Prepare ${t.task_name} for ${recipeName}`,
          scheduled_at: taskScheduleTime.toISOString(),
          status: 'pending',
        })

        // Actionable notification
        notificationsToInsert.push({
          user_id,
          meal_plan_id: newPlan.id,
          title: `🔔 ${meal_type.toUpperCase()} PREPARATION`,
          message: `${t.task_name}: ${t.description || `Required for ${recipeName} at ${planned_time}`}`,
          notification_type: 'preparation',
          scheduled_at: taskScheduleTime.toISOString(),
          status: 'unread',
        })
      }
    } else {
      // Default prep task
      const taskScheduleTime = new Date(startCookingTime.getTime() - prepMinutes * 60 * 1000)
      prepTasksToInsert.push({
        user_id,
        meal_plan_id: newPlan.id,
        task_name: 'Mise en place',
        description: `Chop vegetables and gather ingredients for ${recipeName}`,
        scheduled_at: taskScheduleTime.toISOString(),
        status: 'pending',
      })
      notificationsToInsert.push({
        user_id,
        meal_plan_id: newPlan.id,
        title: `🔔 ${meal_type.toUpperCase()} PREPARATION`,
        message: `Mise en place: Gather ingredients for ${recipeName}`,
        notification_type: 'preparation',
        scheduled_at: taskScheduleTime.toISOString(),
        status: 'unread',
      })
    }

    // Add Start Cooking notification
    notificationsToInsert.push({
      user_id,
      meal_plan_id: newPlan.id,
      title: `🍳 TIME TO COOK ${meal_type.toUpperCase()}`,
      message: `Start cooking ${recipeName} now to have it ready on table by ${planned_time}!`,
      notification_type: 'cooking_start',
      scheduled_at: startCookingTime.toISOString(),
      status: 'unread',
    })

    if (prepTasksToInsert.length > 0) {
      await supabase.from('user_preparation_tasks').insert(prepTasksToInsert)
    }
    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert)
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
      calculatedSchedule: {
        mealReadyTime: targetMealTime.toISOString(),
        cookingStartTime: startCookingTime.toISOString(),
        preparationCount: prepTasksToInsert.length,
      },
    })
  } catch (error: any) {
    console.error('[Meal Plans POST Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { task_id, plan_id, status } = body

    if (task_id) {
      const { data, error } = await supabase
        .from('user_preparation_tasks')
        .update({
          status: status || 'completed',
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', task_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, task: data })
    }

    if (plan_id) {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({ status: status || 'completed' })
        .eq('id', plan_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, plan: data })
    }

    return NextResponse.json({ error: 'task_id or plan_id required' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
