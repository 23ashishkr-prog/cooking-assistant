'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Layers3, Plus, ShieldCheck } from 'lucide-react'

type Recipe={id:string;name?:string;title?:string;cuisine?:string|null}
type Ingredient={id:string;name:string}
type Placement={recipe_id:string;cuisine:string;primary_role:string;secondary_role:string;base_critical_path_minutes:number;recipes?:Recipe}

export function MoakaPlacementPanel({recipes}:{recipes:Recipe[]}) {
 const [ingredients,setIngredients]=useState<Ingredient[]>([])
 const [placements,setPlacements]=useState<Placement[]>([])
 const [recipeId,setRecipeId]=useState(recipes[0]?.id||'')
 const [cuisine,setCuisine]=useState(recipes[0]?.cuisine||'Indian')
 const [role,setRole]=useState('main')
 const [ingredientId,setIngredientId]=useState('')
 const [slots,setSlots]=useState<string[]>(['dinner'])
 const [status,setStatus]=useState('')

 async function load(){const r=await fetch('/api/meal-architecture');if(!r.ok)return;const d=await r.json();setIngredients(d.ingredients||[]);setPlacements(d.placements||[]);if(!ingredientId&&d.ingredients?.[0])setIngredientId(d.ingredients[0].id)}
 useEffect(()=>{load()},[])
 async function save(){setStatus('Saving placement…');const r=await fetch('/api/meal-architecture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'placement',recipe_id:recipeId,cuisine,primary_role:role,primary_ingredient_id:ingredientId,slots})});const d=await r.json();setStatus(r.ok?'Placement saved and critical path calculated.':d.error||'Could not save placement.');if(r.ok)load()}
 function toggle(slot:string){setSlots(x=>x.includes(slot)?x.filter(i=>i!==slot):[...x,slot])}
 return <div className="space-y-6">
  <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs"><p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">MOAKA architecture controls</p><h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#223129]">Meal placement</h1><p className="mt-2 text-sm text-[#736e65]">Place every recipe into a cuisine-specific meal role. MOAKA derives the secondary role and critical path; the household rules remain separate.</p></div>
  <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
   <section className="rounded-3xl border border-[#ded9cf] bg-white p-5 shadow-xs"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#faede6] text-[#b25537]"><Layers3 className="size-5"/></span><div><h2 className="font-serif text-lg font-bold">Author a placement</h2><p className="text-xs text-[#736e65]">One row per recipe or component.</p></div></div>
    <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2"><Field label="Recipe"><select value={recipeId} onChange={e=>{setRecipeId(e.target.value);const r=recipes.find(x=>x.id===e.target.value);if(r?.cuisine)setCuisine(r.cuisine)}}>{recipes.map(r=><option key={r.id} value={r.id}>{r.name||r.title}</option>)}</select></Field><Field label="Cuisine"><input value={cuisine} onChange={e=>setCuisine(e.target.value)} /></Field><Field label="Primary role"><select value={role} onChange={e=>setRole(e.target.value)}>{['base','main','side','accompaniment','sweet','complete'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Primary ingredient"><select value={ingredientId} onChange={e=>setIngredientId(e.target.value)}>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></Field></div>
    <div className="mt-4"><p className="text-xs font-bold text-[#736e65]">Meal slots</p><div className="mt-2 flex flex-wrap gap-2">{['breakfast','lunch','dinner','snack'].map(x=><button type="button" key={x} onClick={()=>toggle(x)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${slots.includes(x)?'bg-[#223129] text-white':'bg-[#f4f1eb] text-[#736e65]'}`}>{x}</button>)}</div></div>
    <button type="button" onClick={save} disabled={!recipeId||!ingredientId||!slots.length} className="mt-5 flex items-center gap-2 rounded-xl bg-[#b25537] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Plus className="size-4"/>Save recipe placement</button>{status&&<p className="mt-3 rounded-xl bg-[#f5f1ea] p-3 text-xs text-[#665f55]">{status}</p>}
   </section>
   <aside className="rounded-3xl bg-[#223129] p-5 text-white shadow-xs"><p className="text-xs font-bold uppercase tracking-widest text-[#df9776]">Derived by the model</p><h2 className="mt-1 font-serif text-xl font-bold">What MOAKA controls</h2><div className="mt-5 space-y-4 text-sm text-white/80"><Signal icon={<CheckCircle2/>} title="Role resolution" text="(cuisine, primary role) → secondary role"/><Signal icon={<Clock3/>} title="Critical path" text="Calculated from the recipe step graph"/><Signal icon={<ShieldCheck/>} title="Household checks" text="Cadence, ready stock and equipment stay outside placement"/></div></aside>
  </div>
  <section className="rounded-3xl border border-[#ded9cf] bg-white p-5 shadow-xs"><div className="flex items-center justify-between"><div><h2 className="font-serif text-lg font-bold">Placed recipes</h2><p className="text-xs text-[#736e65]">The planner uses these rows; it never reads raw serve-with metadata.</p></div><span className="rounded-full bg-[#faede6] px-3 py-1 text-xs font-bold text-[#b25537]">{placements.length} placed</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{placements.map(p=><div key={p.recipe_id} className="rounded-2xl border border-[#eee9e0] bg-[#fbfaf7] p-4"><p className="font-bold">{p.recipes?.name||p.recipes?.title||p.recipe_id}</p><p className="mt-1 text-xs text-[#736e65]">{p.cuisine} · {p.primary_role} → {p.secondary_role}</p><p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#b25537]"><Clock3 className="size-3"/>Base critical path {p.base_critical_path_minutes} min</p></div>)}</div></section>
 </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block font-bold text-[#736e65]">{label}<span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#ded9cf] [&_input]:bg-[#fbf9f5] [&_input]:p-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#ded9cf] [&_select]:bg-[#fbf9f5] [&_select]:p-2.5">{children}</span></label>}
function Signal({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="flex gap-3"><span className="text-[#df9776] [&_svg]:size-5">{icon}</span><div><p className="font-bold text-white">{title}</p><p className="text-xs text-white/60">{text}</p></div></div>}