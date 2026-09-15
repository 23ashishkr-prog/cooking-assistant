import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { user_id = 'default_user', recipe_id, missing_items = [], remind_at } = await req.json()
    if (!recipe_id || !Array.isArray(missing_items) || missing_items.length === 0 || !remind_at) {
      return NextResponse.json({ error: 'recipe_id, missing_items, and remind_at are required.' }, { status: 400 })
    }
    const rows = missing_items.map((ingredientName: string) => ({
      user_id, recipe_id, ingredient_name: ingredientName,
      normalized_name: ingredientName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' '),
      remind_at, status: 'pending',
    }))
    const { data, error } = await supabase.from('shopping_reminders').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, reminders: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not create reminders.' }, { status: 500 })
  }
}
