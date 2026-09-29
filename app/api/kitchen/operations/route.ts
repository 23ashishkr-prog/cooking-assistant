import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const keyFor = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function weekStart() { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1)); return isoDay(d) }

async function currentUserId() {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user.id
}

async function householdFor(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: found, error } = await db.from('households').select('*').eq('owner_user_id', userId).maybeSingle()
  if (error) throw error
  if (found) return found
  const { data: household, error: createError } = await db.from('households').insert({ owner_user_id: userId, name: 'My Kitchen' }).select().single()
  if (createError) throw createError
  const { error: memberError } = await db.from('household_members').insert({ household_id: household.id, user_id: userId, display_name: 'You', role: 'owner' })
  if (memberError) throw memberError
  return household
}

async function loadDashboard(db: ReturnType<typeof createAdminClient>, userId: string) {
  const household = await householdFor(db, userId)
  const end = new Date(); end.setUTCDate(end.getUTCDate() + 6)
  const [members, pantry, plans, lists, updates, version] = await Promise.all([
    db.from('household_members').select('*').eq('household_id', household.id).eq('is_active', true).order('role'),
    db.from('household_pantry_items').select('*').eq('household_id', household.id).order('ingredient_name'),
    db.from('meal_plans').select('id, recipe_id, meal_type, planned_date, planned_time, servings, status, recipes(id,name,title,image_url)').eq('user_id', userId).gte('planned_date', isoDay(new Date())).lte('planned_date', isoDay(end)).order('planned_date').order('planned_time'),
    db.from('household_shopping_lists').select('*, household_shopping_items(*)').eq('household_id', household.id).in('status',['draft','ready','ordered']).order('updated_at',{ascending:false}).limit(1),
    db.from('household_updates').select('*').eq('household_id', household.id).order('created_at',{ascending:false}).limit(6),
    db.from('meal_plan_versions').select('*').eq('household_id', household.id).eq('week_start',weekStart()).order('version',{ascending:false}).limit(1),
  ])
  const planRows = plans.data || []
  const ids = planRows.map((plan: any) => plan.id)
  const { data: assignments } = ids.length ? await db.from('meal_assignments').select('*').eq('household_id', household.id).in('meal_plan_id',ids) : { data: [] }
  const pantryRows = pantry.data || []
  return { household, members: members.data || [], pantry: pantryRows, lowStock: pantryRows.filter((i:any)=>Number(i.quantity)<=Number(i.low_stock_threshold)), plans: planRows, assignments: assignments || [], shoppingList: lists.data?.[0] || null, updates: updates.data || [], weekVersion: version.data?.[0] || null }
}

async function refreshShopping(db: ReturnType<typeof createAdminClient>, userId: string, household: any) {
  const start = weekStart()
  let { data: version } = await db.from('meal_plan_versions').select('*').eq('household_id',household.id).eq('week_start',start).order('version',{ascending:false}).limit(1).maybeSingle()
  if (!version) {
    const result = await db.from('meal_plan_versions').insert({household_id:household.id,week_start:start,created_by:userId}).select().single()
    if (result.error) throw result.error
    version = result.data
  }
  const end = new Date(); end.setUTCDate(end.getUTCDate()+6)
  const { data: plans, error: planError } = await db.from('meal_plans').select('recipe_id,servings').eq('user_id',userId).gte('planned_date',isoDay(new Date())).lte('planned_date',isoDay(end))
  if (planError) throw planError
  const ids = [...new Set((plans||[]).map((p:any)=>p.recipe_id))]
  const { data: ingredients, error: ingredientError } = ids.length ? await db.from('recipe_ingredients').select('recipe_id,ingredient_name,normalized_name,quantity,unit,is_optional').in('recipe_id',ids).eq('is_optional',false) : {data:[],error:null}
  if (ingredientError) throw ingredientError
  const portions = new Map((plans||[]).map((p:any)=>[p.recipe_id,Number(p.servings)||4]))
  const totals = new Map<string,any>()
  for (const i of ingredients||[]) {
    const unit=i.unit||'item', ingredient_key=i.normalized_name||keyFor(i.ingredient_name), key=ingredient_key+'|'+unit
    const row=totals.get(key)||{ingredient_key,ingredient_name:i.ingredient_name,unit,required_quantity:0}
    row.required_quantity += Number(i.quantity||1)*((portions.get(i.recipe_id)||4)/4); totals.set(key,row)
  }
  const { data: pantry }=await db.from('household_pantry_items').select('ingredient_key,quantity,unit').eq('household_id',household.id)
  const stock=new Map((pantry||[]).map((p:any)=>[p.ingredient_key+'|'+p.unit,Number(p.quantity)]))
  const items=[...totals.entries()].map(([k,i])=>{const on_hand_quantity=stock.get(k)||0;const quantity_to_buy=Math.max(0,Number((i.required_quantity-on_hand_quantity).toFixed(2)));return {...i,on_hand_quantity,quantity_to_buy,status:quantity_to_buy?'needed':'skipped'}})
  let { data:list }=await db.from('household_shopping_lists').select('*').eq('household_id',household.id).in('status',['draft','ready']).order('updated_at',{ascending:false}).limit(1).maybeSingle()
  if (!list) { const r=await db.from('household_shopping_lists').insert({household_id:household.id,plan_version_id:version.id,status:'ready',created_by:userId}).select().single(); if(r.error) throw r.error; list=r.data }
  else { await db.from('household_shopping_items').delete().eq('shopping_list_id',list.id); await db.from('household_shopping_lists').update({plan_version_id:version.id,status:'ready',updated_at:new Date().toISOString()}).eq('id',list.id) }
  if(items.length) { const {error}=await db.from('household_shopping_items').insert(items.map(i=>({...i,shopping_list_id:list!.id}))); if(error) throw error }
  await db.from('household_updates').insert({household_id:household.id,update_type:'shopping',title:'Grocery list is ready',body:`${items.filter(i=>i.quantity_to_buy>0).length} ingredients still need to be bought.`,created_by:userId})
}

export async function GET() {
  try { const userId=await currentUserId(); return NextResponse.json(await loadDashboard(createAdminClient(),userId)) }
  catch (error:any) { return NextResponse.json({error:error.message==='AUTH_REQUIRED'?'Please sign in to use your shared kitchen.':error.message},{status:error.message==='AUTH_REQUIRED'?401:500}) }
}

export async function POST(req:NextRequest) {
  try {
    const userId=await currentUserId(), db=createAdminClient(), body=await req.json(), household=await householdFor(db,userId)
    if(body.action==='refresh_shopping') await refreshShopping(db,userId,household)
    else if(body.action==='approve_week') {
      let {data:version}=await db.from('meal_plan_versions').select('*').eq('household_id',household.id).eq('week_start',weekStart()).order('version',{ascending:false}).limit(1).maybeSingle()
      if(!version) { const r=await db.from('meal_plan_versions').insert({household_id:household.id,week_start:weekStart(),created_by:userId}).select().single(); if(r.error) throw r.error; version=r.data }
      const {error}=await db.from('meal_plan_versions').update({status:'approved',approved_by:userId,approved_at:new Date().toISOString()}).eq('id',version.id); if(error) throw error
      await db.from('household_updates').insert({household_id:household.id,update_type:'plan',title:'This week is approved',body:'Your meal plan is ready for the kitchen.',created_by:userId})
    } else if(body.action==='record_pantry') {
      const name=String(body.ingredient_name||'').trim(), delta=Number(body.quantity), unit=body.unit||'item'
      if(!name||!Number.isFinite(delta)||!delta) return NextResponse.json({error:'ingredient_name and a non-zero quantity are required'},{status:400})
      const ingredient_key=keyFor(name)
      const {data:existing}=await db.from('household_pantry_items').select('*').eq('household_id',household.id).eq('ingredient_key',ingredient_key).eq('unit',unit).maybeSingle()
      const quantity=Math.max(0,Number(existing?.quantity||0)+delta)
      const result=existing ? await db.from('household_pantry_items').update({quantity,updated_at:new Date().toISOString()}).eq('id',existing.id).select().single() : await db.from('household_pantry_items').insert({household_id:household.id,ingredient_key,ingredient_name:name,quantity,unit,low_stock_threshold:Number(body.low_stock_threshold||0),source:'operations'}).select().single()
      if(result.error) throw result.error
      await db.from('household_pantry_movements').insert({household_id:household.id,pantry_item_id:result.data.id,movement_type:delta>0?'received':'consumed',quantity_delta:delta,unit,actor_user_id:userId,note:body.note||null})
    } else if(body.action==='assign_meal') {
      if(!body.meal_plan_id) return NextResponse.json({error:'meal_plan_id is required'},{status:400})
      const {data:ownedPlan}=await db.from('meal_plans').select('id').eq('id',body.meal_plan_id).eq('user_id',userId).maybeSingle()
      if(!ownedPlan) return NextResponse.json({error:'Meal not found'},{status:404})
      const {error}=await db.from('meal_assignments').upsert({meal_plan_id:ownedPlan.id,household_id:household.id,status:body.status||'sent',cook_note:body.cook_note||null,sent_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'meal_plan_id'}); if(error) throw error
    } else if(body.action==='update_shopping_item') {
      const {data:item}=await db.from('household_shopping_items').select('id,household_shopping_lists!inner(household_id)').eq('id',body.item_id).eq('household_shopping_lists.household_id',household.id).maybeSingle()
      if(!item) return NextResponse.json({error:'Shopping item not found'},{status:404})
      const {error}=await db.from('household_shopping_items').update({status:body.status||'ordered',updated_at:new Date().toISOString()}).eq('id',item.id); if(error) throw error
    } else return NextResponse.json({error:'Unsupported action'},{status:400})
    return NextResponse.json({success:true,dashboard:await loadDashboard(db,userId)})
  } catch(error:any) { return NextResponse.json({error:error.message==='AUTH_REQUIRED'?'Please sign in to use your shared kitchen.':error.message},{status:error.message==='AUTH_REQUIRED'?401:500}) }
}
