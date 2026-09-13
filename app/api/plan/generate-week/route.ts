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
      .select('id, name, title, meal_type, category, cuisine, diet_type, prep_time_minutes, cook_time_minutes, total_time_minutes, ingredients')
      .limit(40)

    const selectedDiet = String(userPref?.diet_type || '').toLowerCase()
    const preferredCuisines = userPref?.cuisines || []
    const blocked = [...(userPref?.allergies || []), ...(userPref?.dislikes || []), ...(userPref?.avoided_ingredients || [])].map((value: string) => value.toLowerCase())
    const eligibleRecipes = (recipes || []).filter((recipe: any) => {
      const dietMatches = !selectedDiet || selectedDiet.includes('flexible') || String(recipe.diet_type || '').toLowerCase() === selectedDiet
      const cuisineMatches = preferredCuisines.length === 0 || preferredCuisines.some((cuisine: string) => cuisine.toLowerCase() === String(recipe.cuisine || '').toLowerCase())
      const timeMatches = !userPref?.max_cook_time || recipe.total_time_minutes <= userPref.max_cook_time
      const safe = !blocked.some((ingredient: string) => JSON.stringify(recipe.ingredients || []).toLowerCase().includes(ingredient))
      return dietMatches && cuisineMatches && timeMatches && safe
    })
    let recipePool = eligibleRecipes.map(r => ({
      id: r.id,
      name: r.name || r.title,
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
    }))

    const baseDate = startDate ? new Date(startDate) : new Date()
    const createdPlans = []

    if (recipePool.length === 0) {
      return NextResponse.json({ error: 'No published recipes are available in Supabase.' }, { status: 503 })
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
