import { z } from 'zod'
const id = z.string().regex(/^[a-z][a-z0-9_]*$/).max(100)
const text = z.string().min(1).max(1500)
const skill = z.enum(['beginner', 'intermediate', 'advanced'])
const quantity = z.preprocess(v => {
  if (typeof v === 'string' && /^\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?$/.test(v)) {
    const [a,b] = v.split(/[-–]/).map(Number); return (a+b)/2
  }
  return v
}, z.number().finite().positive().max(1000000))
const line = z.object({ ingredient_id:id, item:text, qty:quantity, unit:text,
  prep_technique_id:id.optional(), prep_state:text.optional(), gather_qty:quantity.optional(), gather_unit:text.optional(), gather_approximate:z.boolean().optional(),
  recipe_qty:quantity.optional(), recipe_unit:text.optional(), source_brand:text.optional(), default_recipe_id:id.optional(),
  scaling_role:z.enum(['anchor','linear_to_anchor','sub_linear','to_taste']), scaling_exponent:z.number().positive().max(1).optional(),
}).strict()
export const bundleSchema = z.object({version:z.literal('1.3'), root_recipe_id:id,
 identities:z.array(z.object({ingredient_id:id,canonical_name:text,synonyms:z.array(text),category:text,common_substitutes:z.array(id),produced_by:z.array(id)}).strict()).min(1).max(100),
 cooking:z.array(z.object({technique_id:id,name:text,skill_tag:skill,generic_steps:z.array(text).min(1),doneness_signal:text,common_failure:text,recovery_action:text,region_variants:z.array(text)}).strict()).min(1).max(50),
 prep:z.array(z.object({technique_id:id,name:text,skill_tag:skill,method:text}).strict()).max(30),
 sensory:z.array(z.object({test_id:id,name:text,skill_tag:skill,method:text}).strict()).max(30),
 equipment:z.array(z.object({equipment_id:id,name:text,method:text,safety_precheck:text.optional()}).strict()).max(30),
 recipes:z.array(z.object({recipe_id:id,name:text,description:text,region:text,festival_tag:text.nullable(),health_tags:z.array(text),cost_tag:z.enum(['low','medium','high']),servings:z.number().int().positive().max(50),serve_with:text.optional(),
 output:z.object({ingredient_id:id,qty:quantity,unit:text}).strict().optional(),
 substitution_links:z.array(z.object({ingredient_id:id,substitute_id:id,reason:text}).strict()),
 equipment:z.array(id),ingredients:z.array(line).min(1).max(50),
 steps:z.array(z.object({step_id:id,technique_id:id,region_variant:text.optional(),sensory_test_id:id.optional(),duration_min:z.number().finite().nonnegative().max(100000),attention_type:z.enum(['active','passive']),depends_on:z.array(id),equipment:z.array(id),qty_used:z.array(z.object({ingredient_id:id,qty:quantity,unit:text}).strict())}).strict()).min(1).max(60)
 }).strict()).min(1).max(20)
}).strict()
export type Bundle = z.infer<typeof bundleSchema>
export type Recipe = Bundle['recipes'][number]
export type Step = Recipe['steps'][number]
export function normalizeBundle(input:unknown):Bundle {
 const b = bundleSchema.parse(input)
 const unique = (xs:string[]) => {if(new Set(xs).size!==xs.length) throw Error('Duplicate identity or reference')}
 const requireRef = (ok:unknown) => {if(!ok) throw Error('Unresolved MOAKA reference')}
 for(const xs of [b.identities.map(x=>x.ingredient_id),b.recipes.map(x=>x.recipe_id),b.cooking.map(x=>x.technique_id),b.prep.map(x=>x.technique_id),b.sensory.map(x=>x.test_id),b.equipment.map(x=>x.equipment_id)]) unique(xs)
 requireRef(b.recipes.find(r=>r.recipe_id===b.root_recipe_id))
 for(const i of b.identities) { unique(i.produced_by); for(const s of i.common_substitutes) requireRef(b.identities.find(x=>x.ingredient_id===s)); for(const rid of i.produced_by) requireRef(b.recipes.find(r=>r.recipe_id===rid && r.output?.ingredient_id===i.ingredient_id)) }
 for(const r of b.recipes) {
 unique(r.ingredients.map(i=>i.ingredient_id)); unique(r.steps.map(s=>s.step_id))
 for(const e of r.equipment) requireRef(b.equipment.find(x=>x.equipment_id===e))
 for(const sub of r.substitution_links) {requireRef(r.ingredients.find(i=>i.ingredient_id===sub.ingredient_id));requireRef(b.identities.find(i=>i.ingredient_id===sub.substitute_id))}
 if(r.output) requireRef(b.identities.find(i=>i.ingredient_id===r.output!.ingredient_id))
 for(const i of r.ingredients) {
 const identity=b.identities.find(x=>x.ingredient_id===i.ingredient_id);requireRef(identity)
 // Display always resolves to the generic identity; brand remains ingestion metadata.
 i.item=identity!.canonical_name
 if(i.source_brand && identity!.canonical_name.toLowerCase().includes(i.source_brand.toLowerCase())) throw Error('Brand cannot be a canonical identity')
 if(i.prep_technique_id) {const prep=b.prep.find(x=>x.technique_id===i.prep_technique_id);requireRef(prep);i.prep_state=prep!.name}
 if(i.prep_state&&!i.prep_technique_id)throw Error('Prep state needs a technique reference')
 if(i.default_recipe_id) requireRef(identity!.produced_by.includes(i.default_recipe_id))
 if(i.scaling_role==='sub_linear' && i.scaling_exponent===undefined) throw Error('Author sub-linear scaling exponent')
 if([i.gather_qty,i.gather_unit,i.recipe_qty,i.recipe_unit].some(x=>x!==undefined) && !(i.gather_qty && i.gather_unit && i.recipe_qty && i.recipe_unit && i.gather_approximate===true)) throw Error('Incomplete authored gather split')
 if(i.gather_qty && /^(g|kg|oz|lb|cloves?|pieces?|count)$/i.test(i.unit))throw Error('Shoppable weight or count needs no gather derivation')
 if(i.recipe_qty && (i.qty!==i.recipe_qty || i.unit!==i.recipe_unit)) throw Error('Total must use recipe measurement')
 let used=0
 for(const s of r.steps) for(const u of s.qty_used.filter(u=>u.ingredient_id===i.ingredient_id)) {if(u.unit!==i.unit) throw Error('Quantity unit mismatch');used+=u.qty}
 if(used>i.qty+1e-6) throw Error('Step quantities exceed ingredient total')
 if(used===0) throw Error('Ingredient has no consuming step')
 }
 const visited=new Set<string>(), stack=new Set<string>()
 const visit=(sid:string) => {if(stack.has(sid)) throw Error('Dependency cycle');if(visited.has(sid))return;const s=r.steps.find(x=>x.step_id===sid);requireRef(s);stack.add(sid);s!.depends_on.forEach(visit);stack.delete(sid);visited.add(sid)}
 for(const s of r.steps) {
 const tech=b.cooking.find(t=>t.technique_id===s.technique_id);requireRef(tech)
 if(s.region_variant) requireRef(tech!.region_variants.includes(s.region_variant))
 if(s.sensory_test_id)requireRef(b.sensory.find(x=>x.test_id===s.sensory_test_id))
 s.equipment.forEach(e=>requireRef(r.equipment.includes(e)))
 s.qty_used.forEach(u=>requireRef(r.ingredients.find(i=>i.ingredient_id===u.ingredient_id)))
 unique(s.depends_on); visit(s.step_id)
 }
 }
 const visitRecipe=(rid:string,path:string[])=>{if(path.includes(rid))throw Error('Component recursion cycle');for(const i of b.recipes.find(r=>r.recipe_id===rid)!.ingredients) for(const child of b.identities.find(x=>x.ingredient_id===i.ingredient_id)!.produced_by) visitRecipe(child,[...path,rid])}
 b.recipes.forEach(r=>visitRecipe(r.recipe_id,[]))
 for(const identity of b.identities) {
  const shapes=new Set<string>()
  for(const rid of identity.produced_by) {
   const r=b.recipes.find(r=>r.recipe_id===rid)!
   const memo:Record<string,string>={}
   const shape=(id:string):string=>memo[id]??(memo[id]='('+r.steps.find(s=>s.step_id===id)!.depends_on.map(shape).sort().join(',')+')')
   const signature=r.steps.map(s=>shape(s.step_id)).sort().join('|')
   if(shapes.has(signature))throw Error('Component variants must have different step graphs')
   shapes.add(signature)
  }
 }
 return b
}
export function scaleFactor(i:Recipe['ingredients'][number], factor:number) {return i.scaling_role==='to_taste'?1:i.scaling_role==='sub_linear'?Math.pow(factor,i.scaling_exponent!):factor}
export function recipeSkill(b:Bundle,r:Recipe) {const ranks=['beginner','intermediate','advanced'];return ranks[Math.max(0,...r.steps.map(s=>ranks.indexOf(b.cooking.find(t=>t.technique_id===s.technique_id)!.skill_tag)),...r.ingredients.map(i=>ranks.indexOf(b.prep.find(t=>t.technique_id===i.prep_technique_id)?.skill_tag||'beginner')),...r.steps.map(s=>ranks.indexOf(b.sensory.find(t=>t.test_id===s.sensory_test_id)?.skill_tag||'beginner')))]}
