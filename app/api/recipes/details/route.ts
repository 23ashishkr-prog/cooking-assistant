import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Recipe id is required' }, { status: 400 })

    const { data: recipe, error: recError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (recError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const [ingredientsRes, tasksRes, stepsRes] = await Promise.all([
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', id),
      supabase.from('recipe_preparation_tasks').select('*').eq('recipe_id', id).order('sequence', { ascending: true }),
      supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number', { ascending: true }),
    ])

    return NextResponse.json({
      recipe: {
        ...recipe,
        title: recipe.name || recipe.title,
        name: recipe.name || recipe.title,
        ingredientsList: ingredientsRes.data || [],
        preparationTasks: tasksRes.data || [],
        stepsList: stepsRes.data || [],
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
