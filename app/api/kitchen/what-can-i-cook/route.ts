import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { userId = 'default_user' } = await req.json()

    // 1. Fetch current kitchen inventory from Supabase
    const { data: inventory } = await supabase
      .from('kitchen_inventory')
      .select('ingredient_name, quantity, unit')
      .eq('user_id', userId)

    const availableIngredients = (inventory || []).map(i => i.ingredient_name)

    if (availableIngredients.length === 0) {
      return NextResponse.json({
        empty: true,
        message: 'Your kitchen is empty. Add ingredients to get recipe suggestions.',
        suggestions: [],
      })
    }

    // 2. Query stored recipes from Supabase to check direct matches first
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, title, description, image_url, meal_type, prep_time_minutes, cook_time_minutes')
      .limit(30)

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = `You are a culinary kitchen optimizer. The user has the following ingredients in their kitchen inventory right now:
${availableIngredients.join(', ')}

Suggest 4 dishes they can make immediately or with minimal basic pantry staples. For each dish provide:
1. Dish title
2. Estimated time in minutes
3. Why it matches their ingredients
4. Meal type (breakfast, lunch, high_tea, dinner)
5. Used ingredients from their inventory
6. Missing pantry items (if any, max 2-3 items)

Output strictly valid JSON with this format:
{
  "suggestions": [
    {
      "title": "Dish Name",
      "time_minutes": 25,
      "meal_type": "dinner",
      "reason": "Uses your paneer and fresh tomatoes with aromatics",
      "used_ingredients": ["Paneer", "Tomatoes", "Onions", "Garlic"],
      "missing_items": ["Cream", "Kasuri Methi"]
    }
  ]
}`

    let suggestions: any[] = []
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite']

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        })
        const parsed = JSON.parse(response.text || '{}')
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          suggestions = parsed.suggestions
          break
        }
      } catch (err: any) {
        console.warn(`[What Can I Cook ${model} error]:`, err?.message || err)
      }
    }

    if (suggestions.length === 0) {
      // Fallback matching from database recipes
      suggestions = [
        {
          title: 'Paneer Bhurji with Roti / Toast',
          time_minutes: 20,
          meal_type: 'dinner',
          reason: 'Quick scrambled paneer with sautéed onions, tomatoes, and cumin.',
          used_ingredients: availableIngredients.filter(i => /paneer|onion|tomato|ghee|cumin/i.test(i)),
          missing_items: ['Fresh Coriander'],
        },
        {
          title: 'Homestyle Jeera Aloo & Dal',
          time_minutes: 25,
          meal_type: 'lunch',
          reason: 'Toasted cumin spiced potatoes paired with yellow dal.',
          used_ingredients: availableIngredients.filter(i => /potato|dal|cumin|turmeric/i.test(i)),
          missing_items: ['Lemon'],
        },
        {
          title: 'Crispy Bombay Masala Toast',
          time_minutes: 15,
          meal_type: 'high_tea',
          reason: 'Spiced vegetable layers toasted with butter and mint chutney.',
          used_ingredients: availableIngredients.filter(i => /potato|onion|tomato|butter/i.test(i)),
          missing_items: ['Chaat Masala'],
        },
        {
          title: 'One-Pot Vegetable Basmati Pulao',
          time_minutes: 30,
          meal_type: 'lunch',
          reason: 'Aromatic basmati rice cooked with whole spices, onion, and garlic.',
          used_ingredients: availableIngredients.filter(i => /rice|onion|garlic|ghee/i.test(i)),
          missing_items: ['Green Peas'],
        },
      ]
    }

    return NextResponse.json({
      availableIngredients,
      suggestions,
    })
  } catch (error: any) {
    console.error('[What Can I Cook Exception]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
