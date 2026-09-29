import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const today = () => new Date().toISOString().slice(0, 10)

async function userId() {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user.id
}

async function householdFor(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: membership } = await db.from('household_members').select('household_id, households(*)').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle()
  if (membership?.households) return membership.households as any
  const { data: household, error } = await db.from('households').insert({ owner_user_id: userId, name: 'My Kitchen' }).select().single()
  if (error) throw error
  const { error: memberError } = await db.from('household_members').insert({ household_id: household.id, user_id: userId, display_name: 'You', role: 'owner' })
  if (memberError) throw memberError
  return household
}

export async function GET() {
  try {
    const id = await userId(), db = createAdminClient(), household = await householdFor(db, id), date = today()
    const [approval, contacts, deliveries] = await Promise.all([
      db.from('household_plan_approvals').select('*').eq('household_id', household.id).eq('planned_date', date).maybeSingle(),
      db.from('household_delivery_contacts').select('*').eq('household_id', household.id).order('created_at'),
      db.from('household_plan_deliveries').select('*, household_delivery_contacts(name, phone_e164)').eq('household_id', household.id).eq('planned_date', date).order('created_at', { ascending: false }).limit(5),
    ])
    return NextResponse.json({ household, today: date, approval: approval.data || null, contacts: contacts.data || [], deliveries: deliveries.data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message === 'AUTH_REQUIRED' ? 'Please sign in to control the plan.' : error.message }, { status: error.message === 'AUTH_REQUIRED' ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const id = await userId(), db = createAdminClient(), household = await householdFor(db, id), body = await req.json()
    const plannedDate = body.planned_date || today()

    if (body.action === 'approve') {
      const { data, error } = await db.from('household_plan_approvals').upsert({
        household_id: household.id, planned_date: plannedDate, status: 'approved', approved_by: id, approved_at: new Date().toISOString(),
      }, { onConflict: 'household_id,planned_date' }).select().single()
      if (error) throw error
      await db.from('household_updates').insert({ household_id: household.id, update_type: 'plan', title: 'Today’s plan approved', body: 'The kitchen can start prep and cooking for today.', created_by: id })
      return NextResponse.json({ success: true, approval: data })
    }

    if (body.action === 'save_contact') {
      const name = String(body.name || '').trim(), phone = String(body.phone_e164 || '').trim()
      if (!name || !/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: 'Enter a name and mobile number with country code, for example +919876543210.' }, { status: 400 })
      const { data, error } = await db.from('household_delivery_contacts').upsert({
        household_id: household.id, name, phone_e164: phone, language_code: body.language_code || 'en-IN', prefers_voice: Boolean(body.prefers_voice), updated_at: new Date().toISOString(),
      }, { onConflict: 'household_id,phone_e164' }).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, contact: data })
    }

    if (body.action === 'queue_delivery') {
      const contactId = String(body.contact_id || '')
      const { data: contact } = await db.from('household_delivery_contacts').select('*').eq('id', contactId).eq('household_id', household.id).maybeSingle()
      if (!contact) return NextResponse.json({ error: 'Choose a delivery contact first.' }, { status: 404 })
      const { data: plans } = await db.from('meal_plans').select('meal_type, planned_time, recipes(name,title)').eq('user_id', id).eq('planned_date', plannedDate).order('planned_time')
      const meals = (plans || []).map((plan: any) => `${plan.meal_type}: ${plan.recipes?.name || plan.recipes?.title || 'Meal'} at ${String(plan.planned_time).slice(0,5)}`).join('; ')
      const messageText = body.message_text || `Moaka kitchen plan for ${plannedDate}. ${meals || 'No meals are planned yet.'}`
      const { data, error } = await db.from('household_plan_deliveries').insert({
        household_id: household.id, contact_id: contact.id, planned_date: plannedDate, delivery_type: body.voice ? 'voice' : 'text', language_code: contact.language_code, message_text: messageText, status: 'queued', failure_reason: 'Awaiting an approved WhatsApp delivery provider.', created_by: id,
      }).select().single()
      if (error) throw error
      return NextResponse.json({ success: true, delivery: data, messageText })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message === 'AUTH_REQUIRED' ? 'Please sign in to control the plan.' : error.message }, { status: error.message === 'AUTH_REQUIRED' ? 401 : 500 })
  }
}