import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const maxDuration = 60

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts()
  const value = (kind: string) => parts.find((part) => part.type === kind)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
function jsonFromModel(text: string) {
  return JSON.parse(text.replace(/^\s*\`\`\`json/i, '').replace(/\`\`\`\s*$/, '').trim())
}

export async function POST(req: NextRequest) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to use Dadi.' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Dadi is not configured yet. Add GEMINI_API_KEY to the application environment.' }, { status: 503 })

  try {
    const form = await req.formData()
    const photo = form.get('photo')
    if (!(photo instanceof File) || !photo.size) return NextResponse.json({ error: 'A food photo is required.' }, { status: 400 })
    if (photo.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Please use a photo smaller than 5 MB.' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP food photo.' }, { status: 400 })

    const userId = user.id
    const date = todayInIndia()
    const admin = createAdminClient()
    const [healthResult, intakeResult, planResult] = await Promise.all([
      admin.from('user_health_profiles').select('daily_calorie_target').eq('user_id', userId).maybeSingle(),
      admin.from('meal_intake_logs').select('estimated_calories').eq('user_id', userId).eq('logged_on', date),
      admin.from('meal_plans').select('meal_type, planned_time, recipes(name, title, calories)').eq('user_id', userId).eq('planned_date', date).neq('status', 'cancelled'),
    ])
    const already = (intakeResult.data || []).reduce((total, item) => total + Number(item.estimated_calories || 0), 0)
    const calorieTarget = Number(healthResult.data?.daily_calorie_target || 2000)
    const plans = (planResult.data || []).map((item: any) => ({ slot: item.meal_type, time: item.planned_time, recipe: item.recipes?.name || item.recipes?.title || 'planned meal', calories: item.recipes?.calories || null }))
    const image = Buffer.from(await photo.arrayBuffer()).toString('base64')
    const prompt = `You are Dadi, a warm, practical Indian meal guide. Analyse ONLY food and drinks visible in this photo. Do not identify people or diagnose health conditions. Estimates are approximate.

Today is ${date}. Already logged: ${already} kcal. Daily target: ${calorieTarget} kcal. Today's plan: ${JSON.stringify(plans)}.

Return strict JSON only:
{"description":"short food/drink description","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"impact":"plain-language impact on today's plan","next_step":"one practical adjustment for the next meal","local_alternative":{"title":"short Indian alternative name","reason":"why it is a better swap","calories":number},"note":"brief estimate disclaimer"}
If this is a high-sugar packaged drink (for example Coke, soda, sweet juice), suggest an authentic local Indian alternative such as nimbu pani with little/no sugar, chaas, coconut water, kokum sharbat with little/no sugar, jaljeera, or unsweetened iced tea. Make the alternative relevant; if no swap is useful, use empty strings and 0. Use non-negative realistic numbers.`
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MEAL_VISION_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: image, mimeType: photo.type } }] }],
      config: { responseMimeType: 'application/json' },
    })
    const analysis = jsonFromModel(response.text || '')
    const calories = Math.max(0, Math.round(Number(analysis.calories) || 0))
    const protein = Math.max(0, Number(analysis.protein_g) || 0)
    const carbs = Math.max(0, Number(analysis.carbs_g) || 0)
    const fat = Math.max(0, Number(analysis.fat_g) || 0)
    const foodDescription = String(analysis.description || 'Food meal check-in').slice(0, 500)
    const localAlternative = analysis.local_alternative || {}

    const { error: insertError } = await admin.from('meal_intake_logs').insert({
      user_id: userId, logged_on: date, meal_slot: 'photo_checkin', food_description: foodDescription,
      estimated_calories: calories, protein_g: protein, carbs_g: carbs, fat_g: fat, analysis,
    })
    if (insertError) throw new Error(insertError.message)

    const todayCalories = already + calories
    return NextResponse.json({
      description: foodDescription, calories, protein_g: protein, carbs_g: carbs, fat_g: fat,
      today_calories: todayCalories, calorie_target: calorieTarget, remaining_calories: calorieTarget - todayCalories,
      impact: String(analysis.impact || 'This has been added to today’s food log.'),
      next_step: String(analysis.next_step || 'Keep your next meal balanced with vegetables and protein.'),
      local_alternative: { title: String(localAlternative.title || ''), reason: String(localAlternative.reason || ''), calories: Math.max(0, Math.round(Number(localAlternative.calories) || 0)) },
      note: String(analysis.note || 'Photo-based nutrition is an estimate, not medical advice.'),
    })
  } catch (error: any) {
    console.error('[Dadi meal check-in]', error)
    return NextResponse.json({ error: error?.message || 'Dadi could not analyse this meal. Please try again.' }, { status: 500 })
  }
}
