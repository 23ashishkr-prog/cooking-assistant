'use client'

import { useEffect, useState } from 'react'

type Dashboard = {
  household: { name: string }
  pantry: any[]
  lowStock: any[]
  plans: any[]
  assignments: any[]
  shoppingList: any | null
  updates: any[]
  weekVersion: any | null
}

export function KitchenOperationsPanel() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/kitchen/operations', { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) setNotice(payload.error || 'Could not load kitchen operations.')
    else { setData(payload); setNotice('') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setNotice('')
    const response = await fetch('/api/kitchen/operations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const payload = await response.json()
    if (!response.ok) { setNotice(payload.error || 'That update could not be saved.'); return }
    setData(payload.dashboard)
    setNotice(action === 'refresh_shopping' ? 'Grocery requirements are calculated from this week’s recipes.' : 'Kitchen updated.')
  }

  if (loading) return <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 text-sm text-[#736e65]">Loading your kitchen operations…</div>
  if (!data) return <div className="rounded-3xl border border-[#f0c9bb] bg-[#fff5f0] p-5 text-sm text-[#b73708]">{notice || 'Sign in to start your shared kitchen.'}</div>

  const shoppingItems = data.shoppingList?.household_shopping_items || []
  const needed = shoppingItems.filter((item: any) => item.status === 'needed')
  const sent = new Set(data.assignments.filter((item: any) => item.status === 'sent' || item.status === 'acknowledged' || item.status === 'cooking').map((item: any) => item.meal_plan_id))

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-[#223129] p-5 text-white shadow-xs sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f5a586]">Kitchen operating system</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-serif text-2xl font-bold">{data.household.name}</h2><p className="mt-1 text-sm text-white/70">Plan the week, see what is missing, and keep the cooking handoff clear.</p></div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{data.weekVersion?.status === 'approved' ? '✓ Week approved' : 'Draft week'}</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => act('approve_week')} className="rounded-xl bg-[#f4510b] px-4 py-2 text-xs font-bold text-white hover:bg-[#d83f05]">Approve this week</button>
          <button type="button" onClick={() => act('refresh_shopping')} className="rounded-xl border border-white/25 px-4 py-2 text-xs font-bold hover:bg-white/10">Build grocery list</button>
        </div>
      </div>

      {notice && <p className="rounded-xl border border-[#c4e2cd] bg-[#eef6f0] p-3 text-xs font-semibold text-[#245e38]">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ded9cf] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#b25537]">Pantry</p><p className="mt-2 text-2xl font-bold text-[#223129]">{data.pantry.length}</p><p className="text-xs text-[#736e65]">{data.lowStock.length} low or empty items</p></div>
        <div className="rounded-2xl border border-[#ded9cf] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#b25537]">To buy</p><p className="mt-2 text-2xl font-bold text-[#223129]">{needed.length}</p><p className="text-xs text-[#736e65]">based on planned recipes</p></div>
        <div className="rounded-2xl border border-[#ded9cf] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#b25537]">Kitchen handoff</p><p className="mt-2 text-2xl font-bold text-[#223129]">{sent.size}/{data.plans.length}</p><p className="text-xs text-[#736e65]">upcoming meals sent</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#ded9cf] bg-white p-5">
          <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold text-[#223129]">Next meals</h3><span className="text-xs text-[#736e65]">Send the plan to cook</span></div>
          <div className="mt-3 space-y-2">
            {data.plans.slice(0, 5).map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f4] p-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-[#223129]">{plan.recipes?.name || plan.recipes?.title || 'Planned meal'}</p><p className="text-xs text-[#736e65]">{plan.meal_type} · {plan.planned_date} · {plan.planned_time?.slice(0,5)}</p></div>
                <button type="button" onClick={() => act('assign_meal',{meal_plan_id:plan.id})} className="shrink-0 rounded-lg border border-[#f0c9bb] bg-[#fff5f0] px-2.5 py-1.5 text-[11px] font-bold text-[#b73708]">{sent.has(plan.id) ? 'Sent' : 'Send'}</button>
              </div>
            ))}
            {!data.plans.length && <p className="text-sm text-[#736e65]">Add meals to your plan and they will appear here.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-[#ded9cf] bg-white p-5">
          <div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold text-[#223129]">Grocery list</h3><span className="text-xs font-bold text-[#b25537]">{data.shoppingList?.status || 'Not created'}</span></div>
          <div className="mt-3 space-y-2">
            {shoppingItems.slice(0, 6).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f4] p-3"><div><p className="text-sm font-bold text-[#223129]">{item.ingredient_name}</p><p className="text-xs text-[#736e65]">{item.quantity_to_buy} {item.unit} to buy · {item.on_hand_quantity} in pantry</p></div><button type="button" onClick={() => act('update_shopping_item',{item_id:item.id,status:'ordered'})} disabled={item.status !== 'needed'} className="rounded-lg border border-[#ded9cf] px-2.5 py-1.5 text-[11px] font-bold text-[#536158] disabled:opacity-45">{item.status === 'needed' ? 'Mark ordered' : item.status}</button></div>
            ))}
            {!shoppingItems.length && <p className="text-sm text-[#736e65]">Build the list after planning the week.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
