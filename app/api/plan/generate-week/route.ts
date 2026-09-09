import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

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

    const recipePool = (recipes || []).map(r => ({
      id: r.id,
      name: r.name || r.title,
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
    }))

    const baseDate = startDate ? new Date(startDate) : new Date()
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const createdPlans = []

    // Generate 7 days of plans
    for (let i = 0; i < 7; i++) {
      const planDate = new Date(baseDate)
      planDate.setDate(baseDate.getDate() + i)
      const dateStr = planDate.toISOString().split('T')[0]

      const slots = [
        { type: 'breakfast', time: '08:30', defaultRecipe: 'rec-masala-dosa' },
        { type: 'lunch', time: '13:00', defaultRecipe: 'rec-dal-tadka-rice' },
        { type: 'high_tea', time: '17:00', defaultRecipe: 'rec-veg-grilled-sandwich' },
        { type: 'dinner', time: '20:30', defaultRecipe: 'rec-paneer-butter-masala' },
      ]

      for (const slot of slots) {
        // Pick recipe matching meal_type or default
        const matches = recipePool.filter(r => r.meal_type === slot.type)
        const chosen = matches.length > 0 ? matches[i % matches.length] : null
        const recipeId = chosen ? chosen.id : slot.defaultRecipe

        const { data: newPlan } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userId,
            recipe_id: recipeId,
            meal_type: slot.type,
            planned_date: dateStr,
            planned_time: slot.time,
            servings: 4,
            status: 'planned',
          })
          .select()
          .single()

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
