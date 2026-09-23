import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  return user && user.id === process.env.MOAKA_ADMIN_USER_ID ? user : null
}

export async function GET() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to use Meal Placement.' }, { status: 401 })
  const [ingredients, placements] = await Promise.all([
    client.from('ingredients').select('id,name').order('name').limit(1000),
    client.from('recipe_placements').select('recipe_id,cuisine,primary_role,secondary_role,base_critical_path_minutes,recipes(name,title)').order('updated_at',{ascending:false}).limit(100),
  ])
  return NextResponse.json({ ingredients: ingredients.data || [], placements: placements.data || [] })
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Meal placement editing requires a configured MOAKA administrator.' }, { status: 403 })
  const body = await request.json()
  if (body.action !== 'placement' || !body.recipe_id || !body.cuisine || !body.primary_role || !body.primary_ingredient_id || !Array.isArray(body.slots) || !body.slots.length) return NextResponse.json({ error: 'Recipe, cuisine, role, primary ingredient and slot are required.' }, { status: 400 })
  const secondary = body.primary_role === 'complete' ? 'complete' : body.primary_role === 'base' ? 'base' : body.primary_role === 'side' ? 'side' : body.primary_role === 'accompaniment' ? 'accompaniment' : body.primary_role === 'sweet' ? 'sweet' : 'main'
  const db = createAdminClient()
  const { error: vocabularyError } = await db.from('cuisine_role_vocabulary').upsert({ cuisine: body.cuisine, primary_role: body.primary_role, secondary_role: secondary }, { onConflict: 'cuisine,primary_role' })
  if (vocabularyError) return NextResponse.json({ error: vocabularyError.message }, { status: 400 })
  const { data, error } = await db.from('recipe_placements').upsert({ recipe_id: body.recipe_id, cuisine: body.cuisine, primary_role: body.primary_role, primary_ingredient_id: body.primary_ingredient_id, slots: body.slots }, { onConflict: 'recipe_id' }).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ placement: data })
}