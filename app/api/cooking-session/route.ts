import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { recipe_id, meal_plan_id, user_id = 'default_user' } = await req.json()

    if (!recipe_id) {
      return NextResponse.json({ error: 'recipe_id required' }, { status: 400 })
    }

    // Check if there is already an active session for this recipe
    const { data: existing } = await supabase
      .from('cooking_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('recipe_id', recipe_id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ session: existing, resumed: true })
    }

    // Create new cooking session
    const { data: session, error } = await supabase
      .from('cooking_sessions')
      .insert({
        user_id,
        recipe_id,
        meal_plan_id: meal_plan_id || null,
        started_at: new Date().toISOString(),
        current_step: 1,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('[Cooking Session Start Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session, resumed: false })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { session_id, current_step, status, step_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const updates: any = {}
    if (typeof current_step === 'number') updates.current_step = current_step
    if (status) {
      updates.status = status
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }

    const { data: session, error } = await supabase
      .from('cooking_sessions')
      .update(updates)
      .eq('id', session_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Record step progress
    if (step_id || typeof current_step === 'number') {
      await supabase.from('cooking_step_progress').insert({
        cooking_session_id: session_id,
        step_id: step_id || null,
        step_number: current_step || 1,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, session })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
