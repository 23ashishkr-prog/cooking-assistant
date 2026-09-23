'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, CookingPot, Layers3, Plus, ShieldCheck, Sparkles } from 'lucide-react'

type Recipe = { id: string; name: string; title?: string; cuisine?: string | null; meal_type?: string | null; total_time?: number | null; prep_time?: number | null; cook_time?: number | null; image_url?: string | null }

const roles = [
  { role: 'base', label: 'Base', note: 'Rice, roti, bhakri, pasta' },
  { role: 'main', label: 'Main', note: 'Dal, curry, protein, vegetable' },
  { role: 'side', label: 'Side', note: 'Raita, salad, koshimbir' },
  { role: 'accompaniment', label: 'Accompaniment', note: 'Pickle, chutney, papad' },
]

export function MoakaPlannerApp({ initialRecipes }: { initialRecipes: Recipe[] }) {
  const [activeRole, setActiveRole] = useState('main')
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const dishes = useMemo(() => initialRecipes.slice(0, 12).map((r, index) => ({
    ...r,
    role: roles[index % roles.length].role,
    time: r.total_time ?? (r.prep_time ?? 15) + (r.cook_time ?? 20),
  })), [initialRecipes])
  const current = dishes.filter(d => selected.includes(d.id))
  const totalTime = current.reduce((sum, item) => sum + item.time, 0)

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
    setNotice(null)
  }

  return <main className="min-h-screen bg-[#f5f6f3] text-[#15251c]">
    <header className="border-b border-[#d8dfd5] bg-[#fbfcfa]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#173b2a] text-[#e6b36a]"><CookingPot className="size-5"/></span><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a66b2a]">MOAKA · Meal architecture</p><h1 className="font-serif text-2xl font-bold">Compose, don’t just choose.</h1></div></div>
        <div className="hidden rounded-full border border-[#c9d8cc] bg-[#edf6ef] px-3 py-1 text-xs font-semibold text-[#256842] sm:block"><span className="mr-1.5 inline-block size-2 rounded-full bg-[#35a66f]"/>Planner model active</div>
      </div>
    </header>

    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1.35fr_.65fr]">
      <section className="space-y-6">
        <div className="rounded-3xl bg-[#173b2a] p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e6b36a]">Tonight · everyday Maharashtrian</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-serif text-3xl font-bold">Build a balanced plate</h2><p className="mt-2 max-w-xl text-sm text-white/70">Fill each structural role. MOAKA checks meal coverage, pantry readiness, ingredient cadence and preparation time before you cook.</p></div><button onClick={() => setNotice(selected.length ? 'Meal passes the structural check. Save it once your planner API is connected.' : 'Choose at least one dish to evaluate.')} className="rounded-xl bg-[#e6b36a] px-4 py-2.5 text-sm font-bold text-[#173b2a]">Evaluate meal</button></div>
          {notice && <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm text-[#f8e7c7]">{notice}</p>}
        </div>

        <div className="rounded-3xl border border-[#d8dfd5] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a66b2a]">Template positions</p><h2 className="font-serif text-xl font-bold">Meal structure</h2></div><span className="text-xs text-[#66736b]">{selected.length} dishes selected</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{roles.map(item => { const match=current.find(x=>x.role===item.role); return <button key={item.role} onClick={()=>setActiveRole(item.role)} className={`rounded-2xl border p-4 text-left transition ${activeRole===item.role?'border-[#2d7653] bg-[#edf6ef]':'border-[#e1e6e0] hover:border-[#9dbba9]'}`}><div className="flex justify-between"><span className="font-bold">{item.label}</span>{match?<CheckCircle2 className="size-5 text-[#2d7653]"/>:<Plus className="size-5 text-[#8c9a91]"/>}</div><p className="mt-1 text-xs text-[#66736b]">{match ? match.name : item.note}</p></button>})}</div>
        </div>

        <div className="rounded-3xl border border-[#d8dfd5] bg-white p-5">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#a66b2a]">Placement library</p><h2 className="font-serif text-xl font-bold">Choose a {activeRole}</h2></div><span className="rounded-full bg-[#f4f5f2] px-3 py-1 text-xs font-semibold">{dishes.length} recipes</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{dishes.map(d => <button key={d.id} onClick={()=>toggle(d.id)} className={`group flex gap-3 rounded-2xl border p-3 text-left transition ${selected.includes(d.id)?'border-[#2d7653] bg-[#f2faf4]':'border-[#e1e6e0] hover:border-[#9dbba9]'}`}><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f6eee1] text-[#a66b2a]"><Layers3 className="size-5"/></div><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-full bg-[#edf6ef] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2d7653]">{d.role}</span><span className="text-[10px] text-[#77837c]">{d.cuisine||'Regional'}</span></div><p className="mt-1 truncate text-sm font-bold">{d.name||d.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-[#66736b]"><Clock3 className="size-3"/>Critical path {d.time} min</p></div></button>)}</div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-[#d8dfd5] bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-[#a66b2a]">Live evaluation</p><h2 className="mt-1 font-serif text-xl font-bold">Planning signals</h2><div className="mt-4 space-y-3"><Signal title="Role coverage" value={`${current.length}/${roles.length} positions`} state={current.length>=3}/><Signal title="Combined base path" value={`${totalTime || 0} minutes`} state={totalTime>0}/><Signal title="Pantry & ready stock" value="Connect stock to confirm" state={false}/><Signal title="Ingredient cadence" value="No repeats checked yet" state={false}/></div></div>
        <div className="rounded-3xl bg-[#f8efe2] p-5"><div className="flex gap-2 text-[#a66b2a]"><Sparkles className="size-5"/><h2 className="font-serif text-lg font-bold text-[#3d2b17]">Why this structure works</h2></div><p className="mt-3 text-sm leading-6 text-[#6f573b]">Templates define required roles; recipe placement tells MOAKA where each dish fits. Pairing is a bonus, not a blocker.</p><button className="mt-4 flex items-center gap-1 text-sm font-bold text-[#8b4d12]">Open architecture controls <ChevronRight className="size-4"/></button></div>
        <div className="rounded-3xl bg-[#edf6ef] p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#2d7653]"/><h2 className="font-serif text-lg font-bold">Household controls</h2></div><ul className="mt-3 space-y-2 text-sm text-[#41604f]"><li>• Ready stock shortens cook time</li><li>• Cadence prevents ingredient repetition</li><li>• Equipment availability is checked</li></ul></div>
      </aside>
    </div>
  </main>
}

function Signal({ title, value, state }: { title:string; value:string; state:boolean }) { return <div className="flex items-center justify-between border-b border-[#eef0ed] pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[#66736b]">{value}</p></div><span className={`size-2.5 rounded-full ${state?'bg-[#35a66f]':'bg-[#d8a33b]'}`}/></div> }