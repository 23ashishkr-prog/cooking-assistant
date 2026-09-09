import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      id,
      name,
      title,
      description,
      meal_type = 'dinner',
      cuisine = 'Global',
      diet_type = 'Vegetarian',
      difficulty = 'Medium',
      prep_time_minutes = 15,
      cook_time_minutes = 20,
      default_servings = 4,
      image_url,
      tips,
      ingredients = [],
      preparation_tasks = [],
      steps = [],
    } = body

    const recipeName = name || title
    if (!recipeName) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 })
    }

    const recipeId = id || 'rec-' + recipeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4)

    // Upsert recipe
    const { data: recipe, error: recError } = await supabase
      .from('recipes')
      .upsert({
        id: recipeId,
        name: recipeName,
        title: recipeName,
        description: description || '',
        meal_type: meal_type.toLowerCase(),
        category: meal_type.charAt(0).toUpperCase() + meal_type.slice(1),
        cuisine,
        diet_type,
        difficulty,
        prep_time_minutes: Number(prep_time_minutes) || 15,
        prep_time: Number(prep_time_minutes) || 15,
        cook_time_minutes: Number(cook_time_minutes) || 20,
        cook_time: Number(cook_time_minutes) || 20,
        total_time_minutes: (Number(prep_time_minutes) || 15) + (Number(cook_time_minutes) || 20),
        default_servings: Number(default_servings) || 4,
        servings: Number(default_servings) || 4,
        image_url: image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
        tips: tips || '',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (recError) {
      return NextResponse.json({ error: recError.message }, { status: 500 })
    }

    // Upsert ingredients if provided
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
      const ingRows = ingredients.map((ing: any) => ({
        recipe_id: recipeId,
        ingredient_name: typeof ing === 'string' ? ing : ing.name || ing.ingredient_name,
        quantity: typeof ing === 'object' ? ing.quantity || 1 : 1,
        unit: typeof ing === 'object' ? ing.unit || 'item' : 'item',
        preparation: typeof ing === 'object' ? ing.preparation || null : null,
      }))
      await supabase.from('recipe_ingredients').insert(ingRows)
    }

    // Upsert prep tasks if provided
    if (Array.isArray(preparation_tasks) && preparation_tasks.length > 0) {
      await supabase.from('recipe_preparation_tasks').delete().eq('recipe_id', recipeId)
      const taskRows = preparation_tasks.map((task: any, index: number) => ({
        recipe_id: recipeId,
        task_name: typeof task === 'string' ? task : task.task_name || task.name,
        description: typeof task === 'object' ? task.description || '' : '',
        duration_minutes: typeof task === 'object' ? task.duration_minutes || 15 : 15,
        sequence: index + 1,
      }))
      await supabase.from('recipe_preparation_tasks').insert(taskRows)
    }

    // Upsert steps if provided
    if (Array.isArray(steps) && steps.length > 0) {
      await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId)
      const stepRows = steps.map((step: any, index: number) => ({
        recipe_id: recipeId,
        step_number: index + 1,
        title: typeof step === 'string' ? `Step ${index + 1}` : step.title || `Step ${index + 1}`,
        instruction: typeof step === 'string' ? step : step.instruction || '',
        duration_seconds: typeof step === 'object' ? step.duration_seconds || 180 : 180,
        temperature: typeof step === 'object' ? step.temperature || 'Medium' : 'Medium',
        visual_check: typeof step === 'object' ? step.visual_check || '' : '',
        tip: typeof step === 'object' ? step.tip || '' : '',
      }))
      await supabase.from('recipe_steps').insert(stepRows)
    }

    return NextResponse.json({ success: true, recipe })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
