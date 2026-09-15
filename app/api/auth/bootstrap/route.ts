import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const ASHISH_PASSWORD_HASH = 'be2ba73b1b35b239fd5df7ab556f22b1e7b9787b1d45b2eeefdd3e677adfbb91'
const email = 'ashish@moaka.app'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const supplied = createHash('sha256').update(String(password || '')).digest()
  const expected = Buffer.from(ASHISH_PASSWORD_HASH, 'hex')
  if (String(username || '').toLowerCase() !== 'ashish' || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })
  let user = listed.users.find(item => item.email === email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: 'ashish', full_name: 'Ashish' } })
    if (error || !data.user) return NextResponse.json({ error: error?.message || 'Could not create account' }, { status: 500 })
    user = data.user
    await Promise.all([
      supabase.from('user_profiles').upsert({ user_id: user.id, name: 'Ashish', family_size: 4, cooking_skill: 'Intermediate', preferred_cooking_time: 30 }, { onConflict: 'user_id' }),
      supabase.from('user_food_preferences').upsert({ user_id: user.id, diet_type: 'Vegetarian', spice_level: 'Medium', cuisines: ['North Indian','South Indian','Italian','Asian'], favorite_ingredients: ['Paneer','Tomatoes','Basmati Rice','Garlic'], allergies: [], dislikes: [], avoided_ingredients: [], excluded_meats: [] }, { onConflict: 'user_id' }),
    ])
  }
  return NextResponse.json({ email, userId: user.id })
}
