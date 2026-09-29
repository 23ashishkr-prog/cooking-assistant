'use client'

import { useEffect, useMemo, useState } from 'react'

type Plan = { id:string; recipe_id:string; meal_type:string; planned_date:string; planned_time:string; servings:number; status:string; recipes?:any; tasks?:any[] }
type Props = { mealPlans: Plan[]; recipes: any[]; isGenerating: boolean; onGenerate: () => void; onCook: (recipe: any, planId: string) => void }

const names: Record<string,string> = { breakfast:'Breakfast', lunch:'Lunch', high_tea:'High tea', dinner:'Dinner' }
const order = ['breakfast','lunch','high_tea','dinner']
const labels: Record<string,string> = { 'en-IN':'English', 'hi-IN':'Hindi', 'kn-IN':'Kannada', 'ta-IN':'Tamil', 'te-IN':'Telugu' }

export function PlanControlCentre({ mealPlans, recipes, isGenerating, onGenerate, onCook }: Props) {
  const dates = useMemo(() => [...new Set(mealPlans.map(p => p.planned_date))].sort(), [mealPlans])
  const [selectedDate, setSelectedDate] = useState('')
  const [control, setControl] = useState<any>(null)
  const [notice, setNotice] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('en-IN')
  const [voice, setVoice] = useState(false)
  const [selectedContact, setSelectedContact] = useState('')

  useEffect(() => { if (!selectedDate && dates.length) setSelectedDate(dates[0]) }, [dates, selectedDate])
  useEffect(() => {
    fetch('/api/plan/control', { cache: 'no-store' }).then(async r => {
      const data = await r.json()
      if (r.ok) { setControl(data); if (data.contacts?.[0]) setSelectedContact(data.contacts[0].id) }
    }).catch(() => undefined)
  }, [])

  const meals = mealPlans.filter(p => p.planned_date === selectedDate).sort((a,b) => order.indexOf(a.meal_type) - order.indexOf(b.meal_type))
  const isApproved = Boolean(control?.approval?.status === 'approved' && control?.approval?.planned_date === selectedDate)

  const action = async (actionName: string, body: Record<string,unknown> = {}) => {
    setNotice('')
    const r = await fetch('/api/plan/control', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:actionName, planned_date:selectedDate, ...body}) })
    const data = await r.json()
    if (!r.ok) { setNotice(data.error || 'Could not save that change.'); return null }
    setNotice(actionName === 'approve' ? 'Today is approved. Your kitchen can now start preparation.' : actionName === 'queue_delivery' ? 'The delivery is queued. Use the preview below until WhatsApp is connected.' : 'Contact saved.')
    if (actionName === 'approve') setControl((previous:any) => ({...previous, approval:data.approval}))
    if (actionName === 'save_contact') {
      setControl((previous:any) => ({...previous, contacts:[...(previous?.contacts || []).filter((c:any)=>c.id!==data.contact.id),data.contact]}))
      setSelectedContact(data.contact.id)
    }
    return data
  }

  const planText = meals.map(plan => `${names[plan.meal_type] || plan.meal_type}: ${plan.recipes?.name || plan.recipes?.title || 'Planned meal'} at ${String(plan.planned_time).slice(0,5)}.`).join(' ')
  const previewVoice = () => {
    if (!('speechSynthesis' in window)) { setNotice('Voice preview is not supported by this browser.'); return }
    const utterance = new SpeechSynthesisUtterance(planText || 'No meals are planned for this day.')
    utterance.lang = language
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return <section className="rounded-3xl border border-[#ded9cf] bg-white p-4 shadow-xs sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b25537]">Kitchen plan control</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#223129]">Your day is planned</h2><p className="mt-1 text-xs text-[#736e65]">Approve once, then the kitchen has one clear set of meals, timings and cooking guides.</p></div>
      <button type="button" onClick={onGenerate} disabled={isGenerating} className="rounded-xl bg-[#223129] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#15201a] disabled:opacity-50">{isGenerating ? 'Planning…' : 'Regenerate week'}</button>
    </div>

    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {(dates.length ? dates : [new Date().toISOString().slice(0,10)]).map(date => <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`min-w-14 rounded-xl border px-3 py-2 text-center text-xs font-bold transition ${selectedDate===date?'border-[#223129] bg-[#223129] text-white':'border-[#e8e1d5] bg-[#faf8f4] text-[#736e65] hover:border-[#b25537]'}`}><span className="block">{new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})}</span><span className="mt-0.5 block text-[10px] opacity-80">{new Date(date+'T12:00:00').getDate()}</span></button>)}
    </div>

    {meals.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {meals.map(plan => { const recipe = plan.recipes || recipes.find(r => r.id===plan.recipe_id); return <div key={plan.id} className="rounded-2xl border border-[#eee8de] bg-[#faf8f4] p-3">
        <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#a08776]">{names[plan.meal_type] || plan.meal_type} · {String(plan.planned_time).slice(0,5)}</p><p className="mt-1 line-clamp-1 text-sm font-bold text-[#223129]">{recipe?.name || recipe?.title || 'Planned meal'}</p><p className="mt-0.5 text-[11px] text-[#736e65]">{plan.servings} servings</p></div>{recipe && <button type="button" onClick={() => onCook(recipe, plan.id)} className="shrink-0 rounded-lg border border-[#f0c9bb] bg-[#fff5f0] px-2 py-1.5 text-[10px] font-bold text-[#b73708]">How to cook</button>}</div>
      </div> })}</div> : <div className="mt-4 rounded-2xl bg-[#faf8f4] p-5 text-sm text-[#736e65]">No meals planned for this day. Generate the week to begin.</div>}

    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => action('approve')} disabled={!meals.length || isApproved} className="rounded-xl bg-[#16a34a] px-4 py-3 text-xs font-bold text-white hover:bg-[#15803d] disabled:opacity-50">{isApproved ? '✓ Day approved' : 'Approve today'}</button>
      <button type="button" onClick={() => setNotice('Choose a meal card and use “How to cook” to open step-by-step cooking mode.')} className="rounded-xl border border-[#ded9cf] bg-white px-4 py-3 text-xs font-bold text-[#536158] hover:border-[#b25537]">View cooking guides</button>
      <details className="group rounded-xl border border-[#ded9cf] bg-white"><summary className="cursor-pointer list-none px-4 py-3 text-center text-xs font-bold text-[#536158]">Send to cook</summary><div className="space-y-3 border-t border-[#f0ece3] p-3 text-xs">
        <select value={selectedContact} onChange={e=>setSelectedContact(e.target.value)} className="w-full rounded-lg border border-[#ded9cf] bg-[#faf8f4] p-2">{(control?.contacts || []).map((c:any)=><option key={c.id} value={c.id}>{c.name} · {labels[c.language_code] || c.language_code}</option>)}<option value="">Add a contact below</option></select>
        <div className="grid grid-cols-2 gap-2"><input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="Cook name" className="rounded-lg border border-[#ded9cf] p-2"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91…" className="rounded-lg border border-[#ded9cf] p-2"/></div>
        <div className="flex gap-2"><select value={language} onChange={e=>setLanguage(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#ded9cf] p-2">{Object.entries(labels).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select><button type="button" onClick={()=>action('save_contact',{name:contactName,phone_e164:phone,language_code:language,prefers_voice:voice})} className="rounded-lg border border-[#223129] px-3 font-bold text-[#223129]">Save</button></div>
        <label className="flex items-center gap-2 text-[#536158]"><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> Make voice version</label>
        <div className="flex gap-2"><button type="button" onClick={previewVoice} className="flex-1 rounded-lg border border-[#ded9cf] px-3 py-2 font-bold text-[#536158]">Preview audio</button><button type="button" onClick={()=>action('queue_delivery',{contact_id:selectedContact,voice})} disabled={!selectedContact || !meals.length} className="flex-1 rounded-lg bg-[#223129] px-3 py-2 font-bold text-white disabled:opacity-40">Queue WhatsApp</button></div>
      </div></details>
    </div>
    {notice && <p className="mt-3 rounded-xl bg-[#eef6f0] p-3 text-xs font-semibold text-[#245e38]">{notice}</p>}
  </section>
}