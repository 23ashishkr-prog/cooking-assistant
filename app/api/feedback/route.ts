import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'default_user'

    // Fetch feedback history
    const { data: feedback, error } = await supabase
      .from('recipe_feedback')
      .select(`
        id, recipe_id, rating, liked, comment, feedback_tags, created_at,
        recipes (id, name, title, description, image_url, meal_type, total_time_minutes)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also calculate cook frequency from completed cooking_sessions
    const { data: sessions } = await supabase
      .from('cooking_sessions')
      .select('recipe_id, status')
      .eq('user_id', userId)

    const cookCounts: Record<string, number> = {}
    for (const s of sessions || []) {
      cookCounts[s.recipe_id] = (cookCounts[s.recipe_id] || 0) + 1
    }

    return NextResponse.json({
      feedback: feedback || [],
      cookCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      recipe_id,
      rating = 5,
      liked = true,
      comment = '',
      feedback_tags = [],
      user_id = 'default_user',
    } = body

    if (!recipe_id) {
      return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recipe_feedback')
      .insert({
        user_id,
        recipe_id,
        rating: Number(rating) || 5,
        liked: Boolean(liked),
        comment: comment || null,
        feedback_tags: feedback_tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[Feedback POST Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, feedback: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
