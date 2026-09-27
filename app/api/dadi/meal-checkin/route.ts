import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const maxDuration = 60

function indiaNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts()
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value || ''
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) }
}
function jsonFromModel(text: string) {
  return JSON.parse(text.replace(/^\s*\`\`\`json/i, '').replace(/\`\`\`\s*$/, '').trim())
}

export async function POST(req: NextRequest) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to talk with Dadi.' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Dadi is not configured yet. Add GEMINI_API_KEY to the application environment.' }, { status: 503 })

  try {
    const form = await req.formData()
    const photo = form.get('photo')
    const intention = String(form.get('intention') || '').trim()
    if (!(photo instanceof File) && !intention) return NextResponse.json({ error: 'Tell Dadi what you are planning to have, or add a food photo.' }, { status: 400 })
    if (photo instanceof File && photo.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Please use a photo smaller than 5 MB.' }, { status: 400 })
    if (photo instanceof File && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP food photo.' }, { status: 400 })

    const userId = user.id
    const now = indiaNow()
    const admin = createAdminClient()
    const [healthResult, intakeResult, planResult] = await Promise.all([
      admin.from('user_health_profiles').select('daily_calorie_target').eq('user_id', userId).maybeSingle(),
      admin.from('meal_intake_logs').select('food_description, estimated_calories, protein_g, created_at').eq('user_id', userId).eq('logged_on', now.date).order('created_at', { ascending: true }),
      admin.from('meal_plans').select('meal_type, planned_time, recipes(name, title, calories)').eq('user_id', userId).eq('planned_date', now.date).neq('status', 'cancelled'),
    ])
    const intakes = intakeResult.data || []
    const alreadyCalories = intakes.reduce((total, item) => total + Number(item.estimated_calories || 0), 0)
    const alreadyProtein = intakes.reduce((total, item) => total + Number(item.protein_g || 0), 0)
    const calorieTarget = Number(healthResult.data?.daily_calorie_target || 2000)
    const plans = (planResult.data || []).map((item: any) => ({ slot: item.meal_type, time: item.planned_time, recipe: item.recipes?.name || item.recipes?.title || 'planned meal', calories: item.recipes?.calories || null }))
    const currentMeal = now.hour < 11 ? 'morning' : now.hour < 15 ? 'afternoon/lunch' : now.hour < 19 ? 'evening' : 'dinner'
    const context = `It is ${currentMeal} in India. Today the user has already logged about ${alreadyCalories} kcal and ${alreadyProtein.toFixed(1)}g protein. Daily calorie target: ${calorieTarget}. Foods logged today: ${JSON.stringify(intakes.map(item => ({ food: item.food_description, kcal: item.estimated_calories, protein_g: item.protein_g })))}. Today’s plan: ${JSON.stringify(plans)}. User says they are considering: ${intention || 'see the attached food photo'}.`
    const prompt = `You are Dadi, a loving, straightforward Indian grandmother who understands nutrition and the user's meal plan. Reply as a natural spoken conversation, never as a report, bullet list, chart, labels, or JSON fields. Start warmly and name the food/drink you recognise or the food the user mentioned. If it is afternoon, naturally refer to what they have already had this morning/today, then say the calories and protein consumed so far, explain how this choice changes the rest of today’s plan, and give one simple Indian-food suggestion for the next meal. For sugary packaged drinks, suggest a relevant local alternative (nimbu pani with little/no sugar, chaas, coconut water, kokum sharbat, jaljeera etc.). Use approximate numbers and say they are estimates. Keep it to 3–5 short sentences. Do not diagnose disease or give medical advice.\n\n${context}\n\nReturn strict JSON only: {"reply":"the complete natural Dadi reply","description":"short food/drink description","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"suggested_recipe_query":"exact recipe name or empty string"}`
    const parts: any[] = [{ text: prompt }]
    if (photo instanceof File) parts.push({ inlineData: { data: Buffer.from(await photo.arrayBuffer()).toString('base64'), mimeType: photo.type } })
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await ai.models.generateContent({ model: process.env.GEMINI_MEAL_VISION_MODEL || 'gemini-2.5-flash', contents: [{ role: 'user', parts }], config: { responseMimeType: 'application/json' } })
    const analysis = jsonFromModel(response.text || '')
    const suggestedQuery = String(analysis.suggested_recipe_query || '').trim().slice(0, 100)
    let suggestedRecipe: any = null
    if (suggestedQuery) {
      const candidates = [suggestedQuery, suggestedQuery.replace(/^fresh\\s+/i, '')]
      for (const candidate of candidates) {
        const { data } = await admin.from('recipes').select('id, name, title, description, ingredients, instructions, prep_time_minutes, total_time_minutes').ilike('name', `%${candidate}%`).limit(1)
        if (data?.[0]) { suggestedRecipe = data[0]; break }
      }
      if (!suggestedRecipe && /nimbu pani|lemon water|lemonade/i.test(suggestedQuery)) {
        const nimbuRecipe = {
          id: 'moaka-fresh-nimbu-pani', source_name: 'Moaka', name: 'Fresh Nimbu Pani', title: 'Fresh Nimbu Pani',
          description: 'A light Indian lemon drink with mint, black salt and no added sugar.', meal_type: 'high_tea',
          category: 'Beverage', cuisine: 'Indian', diet_type: 'Vegan', prep_time_minutes: 5, cook_time_minutes: 0,
          total_time_minutes: 5, default_servings: 1, calories: 12, nutrition_score: 9.2,
          ingredients: [{ name: 'Fresh lemon', measure: '1 medium' }, { name: 'Chilled water', measure: '300 ml' }, { name: 'Black salt', measure: 'a pinch' }, { name: 'Roasted cumin powder', measure: 'a pinch' }, { name: 'Fresh mint', measure: '4 leaves' }],
          instructions: ['Squeeze the fresh lemon into a glass.', 'Add chilled water, black salt and roasted cumin powder.', 'Stir well, add mint and ice if desired, then serve immediately.'],
          tags: ['drink', 'indian', 'lemon', 'low-calorie', 'dadi'], published: true, data_source: 'Moaka',
        }
        const { data } = await admin.from('recipes').upsert(nimbuRecipe, { onConflict: 'id' }).select('id, name, title, description, ingredients, instructions, prep_time_minutes, total_time_minutes').single()
        suggestedRecipe = data
      }
    }
    const calories = Math.max(0, Math.round(Number(analysis.calories) || 0))
    const protein = Math.max(0, Number(analysis.protein_g) || 0)
    if (photo instanceof File) {
      const { error: insertError } = await admin.from('meal_intake_logs').insert({
        user_id: userId, logged_on: now.date, meal_slot: currentMeal, food_description: String(analysis.description || intention || 'Food meal check-in').slice(0, 500),
        estimated_calories: calories, protein_g: protein, carbs_g: Math.max(0, Number(analysis.carbs_g) || 0), fat_g: Math.max(0, Number(analysis.fat_g) || 0), analysis,
      })
      if (insertError) throw new Error(insertError.message)
    }
    return NextResponse.json({ reply: String(analysis.reply || 'Tell me a little more about what you are having, beta.'), logged: photo instanceof File, calories, protein_g: protein, recipe: suggestedRecipe })
  } catch (error: any) {
    console.error('[Dadi meal conversation]', error)
    return NextResponse.json({ error: error?.message || 'Dadi could not understand that just now. Please try again.' }, { status: 500 })
  }
}
