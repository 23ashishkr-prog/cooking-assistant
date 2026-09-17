import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'default_user'

    const [profileRes, prefRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_food_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ])

    return NextResponse.json({
      profile: profileRes.data || {
        name: 'Ashish',
        family_size: 4,
        cooking_skill: 'Intermediate',
        preferred_cooking_time: 30,
      },
      preferences: prefRes.data || {
        diet_type: 'Vegetarian / Flexible',
        spice_level: 'Medium',
        cuisines: ['North Indian', 'South Indian', 'Italian', 'Asian'],
        allergies: [],
        dislikes: ['Bitter gourd'],
        favorite_ingredients: ['Paneer', 'Tomatoes', 'Basmati Rice', 'Garlic'],
        avoided_ingredients: [],
        excluded_meats: [],
        health_preferences: ['High Protein', 'Fresh Produce'],
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { userId = 'default_user', profile, preferences } = body

    if (profile) {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          name: profile.name,
          family_size: Number(profile.family_size) || 4,
          cooking_skill: profile.cooking_skill || 'Intermediate',
          preferred_cooking_time: Number(profile.preferred_cooking_time) || 30,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (preferences) {
      const { error } = await supabase
        .from('user_food_preferences')
        .upsert({
          user_id: userId,
          diet_type: preferences.diet_type,
          spice_level: preferences.spice_level,
          cuisines: preferences.cuisines || [],
          allergies: preferences.allergies || [],
          dislikes: preferences.dislikes || [],
          favorite_ingredients: preferences.favorite_ingredients || [],
          avoided_ingredients: preferences.avoided_ingredients || [],
          excluded_meats: preferences.excluded_meats || [],
          health_preferences: preferences.health_preferences || [],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
