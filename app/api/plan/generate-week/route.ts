import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { userId = 'default_user', startDate } = await req.json()

    // 1. Fetch user preferences
    const { data: userPref } = await supabase
      .from('user_food_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // 2. Fetch available recipes in Supabase
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, title, meal_type, category, prep_time_minutes, cook_time_minutes')
      .limit(40)

    let recipePool = (recipes || []).map(r => ({
      id: r.id,
      name: r.name || r.title,
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
    }))

    const baseDate = startDate ? new Date(startDate) : new Date()
    const createdPlans = []

    if (recipePool.length === 0) {
      const starterRecipes = [
        { id: 'default-poha', name: 'Poha', meal_type: 'breakfast', category: 'Breakfast', prep_time: 10, cook_time: 15, image_url: '/food-poha.jpg' },
        { id: 'default-rajma-masala', name: 'Rajma Masala', meal_type: 'lunch', category: 'Lunch', prep_time: 15, cook_time: 35, image_url: '/food-rajma.jpg' },
        { id: 'default-masala-chai-pakoras', name: 'Masala Chai & Pakoras', meal_type: 'high_tea', category: 'High Tea', prep_time: 10, cook_time: 20, image_url: '/food-chai-pakora.jpg' },
        { id: 'default-palak-paneer', name: 'Palak Paneer', meal_type: 'dinner', category: 'Dinner', prep_time: 15, cook_time: 25, image_url: '/food-palak-paneer.jpg' },
      ].map(recipe => ({
        ...recipe,
        title: recipe.name,
        description: `A Moaka favorite for ${recipe.category.toLowerCase()}.`,
        cuisine: 'Indian',
        diet_type: 'Vegetarian',
        difficulty: 'Easy',
        prep_time_minutes: recipe.prep_time,
        cook_time_minutes: recipe.cook_time,
        total_time_minutes: recipe.prep_time + recipe.cook_time,
        default_servings: 4,
        servings: 4,
        tips: '',
        updated_at: new Date().toISOString(),
      }))

      const { data: seededRecipes, error: seedError } = await supabase
        .from('recipes')
        .upsert(starterRecipes)
        .select('id, name, title, meal_type, category')

      if (seedError || !seededRecipes?.length) {
        return NextResponse.json({ error: seedError?.message || 'Could not prepare starter recipes.' }, { status: 500 })
      }

      recipePool = seededRecipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name || recipe.title,
        meal_type: (recipe.meal_type || recipe.category || 'dinner').toLowerCase(),
      }))
    }

    // Generate 7 days of plans
    for (let i = 0; i < 7; i++) {
      const planDate = new Date(baseDate)
      planDate.setDate(baseDate.getDate() + i)
      const dateStr = planDate.toISOString().split('T')[0]

      const slots = [
        { type: 'breakfast', time: '08:30' },
        { type: 'lunch', time: '13:00' },
        { type: 'high_tea', time: '17:00' },
        { type: 'dinner', time: '20:30' },
      ]

      for (const slot of slots) {
        // Pick recipe matching meal_type or default
        const matches = recipePool.filter(r => r.meal_type === slot.type)
        // Always use a real database recipe ID so foreign-key inserts cannot fail.
        const chosen = matches.length > 0
          ? matches[i % matches.length]
          : recipePool[(i * slots.length + slots.indexOf(slot)) % recipePool.length]

        const { data: newPlan, error: planError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userId,
            recipe_id: chosen.id,
            meal_type: slot.type,
            planned_date: dateStr,
            planned_time: slot.time,
            servings: 4,
            status: 'planned',
          })
          .select()
          .single()

        if (planError) {
          console.error('[Generate Week Insert Error]:', planError)
          return NextResponse.json({
            error: planError.message || `Could not create ${slot.type} for ${dateStr}`,
            totalMealsCreated: createdPlans.length,
          }, { status: 500 })
        }
        if (newPlan) createdPlans.push(newPlan)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Generated complete 7-day meal plan for the week',
      totalMealsCreated: createdPlans.length,
      plans: createdPlans,
    })
  } catch (error: any) {
    console.error('[Generate Week Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
