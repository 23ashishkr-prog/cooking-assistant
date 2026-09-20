import { type Bundle, type Recipe, type Step, scaleFactor } from './schema'
export type Choices=Record<string,string> // ingredient identity -> buy, stock, or explicit producer recipe
export type ExecutionStep=Step & {recipe_id:string;recipe_name:string}
export type Instance={id:string;recipe_id:string;scheduled_for:string;entry_mode:'impromptu'|'planned';step_state:Record<string,{done:boolean;done_by:string|null;done_at:string|null;started_at:string|null}>}
export function execution(b:Bundle,choices:Choices,servings:number) {
 const steps:ExecutionStep[]=[],gather:{key:string;recipe:string;line:Recipe['ingredients'][number]}[]=[]
 const expand=(rid:string,path:string,factor:number):string[]=>{
 const r=b.recipes.find(x=>x.recipe_id===rid)!
 const producerEnds:Record<string,string[]>={}
 for(const i of r.ingredients) {
 const k=scaleFactor(i,factor), line={...i,qty:i.qty*k,gather_qty:i.gather_qty?i.gather_qty*k:undefined,recipe_qty:i.recipe_qty?i.recipe_qty*k:undefined}
 const choice=choices[i.ingredient_id]||'buy'
 if(choice!=='buy'&&choice!=='stock') {
 const identity=b.identities.find(x=>x.ingredient_id===i.ingredient_id)!
 if(!identity.produced_by.includes(choice))throw Error('Invalid component choice')
 const output=b.recipes.find(x=>x.recipe_id===choice)!.output!
 if(output.unit!==i.unit)throw Error('Component output unit mismatch')
 producerEnds[i.ingredient_id]=expand(choice,path+'/'+i.ingredient_id,line.qty/output.qty)
 }else if(choice!=='stock') gather.push({key:path+'/'+i.ingredient_id,recipe:r.name,line})
 }
 for(const s of r.steps) steps.push({...s,step_id:path+'/'+s.step_id,recipe_id:rid,recipe_name:r.name,depends_on:[...s.depends_on.map(d=>path+'/'+d),...s.qty_used.flatMap(u=>producerEnds[u.ingredient_id]||[])],qty_used:s.qty_used.map(u=>({...u,qty:u.qty*scaleFactor(r.ingredients.find(i=>i.ingredient_id===u.ingredient_id)!,factor)}))})
 return r.steps.filter(s=>!r.steps.some(t=>t.depends_on.includes(s.step_id))).map(s=>path+'/'+s.step_id)
 }
 const root=b.recipes.find(r=>r.recipe_id===b.root_recipe_id)!;expand(root.recipe_id,root.recipe_id,servings/root.servings)
 return {steps,gather}
}
export function criticalPath(steps:ExecutionStep[],done:string[]=[]){const memo:Record<string,number>={};const remaining=(id:string):number=>memo[id]??(memo[id]=(done.includes(id)?0:steps.find(s=>s.step_id===id)!.duration_min)+Math.max(0,...steps.filter(s=>s.depends_on.includes(id)).map(s=>remaining(s.step_id))));steps.forEach(s=>remaining(s.step_id));return {minutes:Math.max(0,...Object.values(memo)),priority:memo}}
export function canStart(s:ExecutionStep,steps:ExecutionStep[],instance:Instance){const state=instance.step_state;return !state[s.step_id]?.done&&!state[s.step_id]?.started_at&&s.depends_on.every(d=>state[d]?.done)&&!steps.some(other=>state[other.step_id]?.started_at&&!state[other.step_id]?.done&&((s.attention_type==='active'&&other.attention_type==='active')||s.equipment.some(e=>other.equipment.includes(e))))}
export function transition(instance:Instance,steps:ExecutionStep[],id:string,action:'start'|'done',actor:string):Instance {const s=steps.find(x=>x.step_id===id);if(!s)throw Error('Unknown step');const old=instance.step_state[id];if(action==='start'&&!canStart(s,steps,instance))throw Error('Step is blocked');if(action==='done'&&(!old?.started_at||old.done))throw Error('Step must be running');const now=new Date().toISOString();return {...instance,step_state:{...instance.step_state,[id]:{done:action==='done',done_by:action==='done'?actor:null,done_at:action==='done'?now:null,started_at:old?.started_at||now}}}}
// List scheduling uses the same one-cook/resource gates as Cook Mode. Critical path
// remains visible separately as the theoretical lower bound.
export function estimatedElapsed(steps:ExecutionStep[]) {
 const priority=criticalPath(steps).priority, done=new Set<string>(), running:{step:ExecutionStep;end:number}[]=[]
 let now=0
 while(done.size<steps.length) {
  const ready=steps.filter(s=>!done.has(s.step_id)&&!running.some(r=>r.step.step_id===s.step_id)&&s.depends_on.every(d=>done.has(d))).sort((a,b)=>priority[b.step_id]-priority[a.step_id])
  for(const s of ready) if(!running.some(r=>(s.attention_type==='active'&&r.step.attention_type==='active')||s.equipment.some(e=>r.step.equipment.includes(e))))running.push({step:s,end:now+s.duration_min})
  if(!running.length)throw Error('Unschedulable graph')
  now=Math.min(...running.map(r=>r.end))
  for(let i=running.length-1;i>=0;i--)if(running[i].end<=now){done.add(running[i].step.step_id);running.splice(i,1)}
 }
 return now
}

export function restoreSession(raw:unknown,bundle:Bundle):{instance:Instance;choices:Choices;servings:number} {
 if(!raw||typeof raw!=='object')throw Error('Invalid session')
 const value=raw as Record<string,unknown>,servings=value.servings
 if(typeof servings!=='number'||!Number.isInteger(servings)||servings<1||servings>20)throw Error('Invalid servings')
 if(!value.choices||typeof value.choices!=='object'||Array.isArray(value.choices))throw Error('Invalid choices')
 const choices=value.choices as Choices
 for(const [id,choice] of Object.entries(choices))if(typeof choice!=='string'||!bundle.identities.some(i=>i.ingredient_id===id&&(choice==='buy'||choice==='stock'||i.produced_by.includes(choice))))throw Error('Invalid choice')
 const instance=value.instance as Instance
 if(!instance||typeof instance.id!=='string'||instance.recipe_id!==bundle.root_recipe_id||!['planned','impromptu'].includes(instance.entry_mode)||!Number.isFinite(Date.parse(instance.scheduled_for))||!instance.step_state||typeof instance.step_state!=='object')throw Error('Invalid instance')
 const steps=execution(bundle,choices,servings).steps
 for(const [id,state] of Object.entries(instance.step_state)) {
 const s=steps.find(s=>s.step_id===id)
 if(!s||!state||typeof state.done!=='boolean'||!state.started_at||!Number.isFinite(Date.parse(state.started_at)))throw Error('Invalid step state')
 if(state.done&&(!state.done_at||!Number.isFinite(Date.parse(state.done_at))||typeof state.done_by!=='string'))throw Error('Missing completion record')
 if(!s.depends_on.every(d=>instance.step_state[d]?.done))throw Error('Incomplete dependency')
 }
 const running=steps.filter(s=>instance.step_state[s.step_id]?.started_at&&!instance.step_state[s.step_id]?.done)
 if(running.some((s,i)=>running.slice(i+1).some(t=>(s.attention_type==='active'&&t.attention_type==='active')||s.equipment.some(e=>t.equipment.includes(e)))))throw Error('Conflicting running steps')
 return {instance,choices,servings}
}
