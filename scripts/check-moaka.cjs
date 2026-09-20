const fs = require('node:fs'), ts = require('typescript'), assert = require('node:assert/strict')
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename)
const {LOCAL_BUNDLE}=require('../lib/moaka/local.ts')
const {normalizeBundle,scaleFactor}=require('../lib/moaka/schema.ts')
const {execution,criticalPath,canStart,transition,estimatedElapsed}=require('../lib/moaka/engine.ts')
const copy=()=>structuredClone(LOCAL_BUNDLE)
let tests=0
const test=(name,fn)=>{fn();tests++;console.log('PASS',name)}
test('local bundle reference integrity',()=>assert.equal(normalizeBundle(LOCAL_BUNDLE).version,'1.3'))
test('range ingestion collapses exactly once',()=>{const b=copy();b.recipes[0].ingredients[0].qty='400–500';assert.equal(normalizeBundle(b).recipes[0].ingredients[0].qty,450)})
test('brand is metadata, display is canonical',()=>{const b=copy();b.recipes[0].ingredients[4].item='MBS Butter Chicken Blend';b.recipes[0].ingredients[4].source_brand='MBS';assert.equal(normalizeBundle(b).recipes[0].ingredients[4].item,'butter chicken spice blend')})
test('overconsumption rejected',()=>{const b=copy();b.recipes[0].steps[3].qty_used[1].qty=21;assert.throws(()=>normalizeBundle(b),/exceed/)})
test('unit mismatch rejected',()=>{const b=copy();b.recipes[0].steps[0].qty_used[0].unit='kg';assert.throws(()=>normalizeBundle(b),/unit/)})
test('dependency cycles rejected',()=>{const b=copy();b.recipes[0].steps[0].depends_on=['s_finish'];assert.throws(()=>normalizeBundle(b),/cycle/)})
test('missing technique rejected',()=>{const b=copy();b.recipes[0].steps[0].technique_id='tech_missing';assert.throws(()=>normalizeBundle(b),/reference/)})
test('duplicate ingredient totals rejected',()=>{const b=copy();b.recipes[0].ingredients.push(b.recipes[0].ingredients[0]);assert.throws(()=>normalizeBundle(b),/Duplicate/)})
test('incomplete gather derivation rejected',()=>{const b=copy();b.recipes[0].ingredients[0].gather_qty=1;assert.throws(()=>normalizeBundle(b),/gather/)})
test('salt does not auto-scale',()=>assert.equal(scaleFactor(LOCAL_BUNDLE.recipes[0].ingredients[5],3),1))
test('buy gracefully leaves sparse identities as leaves',()=>assert.equal(execution(LOCAL_BUNDLE,{},4).steps.length,4))
test('stock removes producer work at component boundary',()=>{const make=execution(LOCAL_BUNDLE,{ing_tikka:'rcp_tikka_baked'},4),stock=execution(LOCAL_BUNDLE,{ing_tikka:'stock'},4);assert.equal(criticalPath(make.steps).minutes,150);assert.equal(criticalPath(stock.steps).minutes,26);assert(!stock.gather.some(g=>g.line.ingredient_id==='ing_tikka'))})
test('explicit quick producer lowers lead time',()=>assert(estimatedElapsed(execution(LOCAL_BUNDLE,{ing_tikka:'rcp_tikka_quick'},4).steps)<45))
test('component scale uses output yield',()=>{const p=execution(LOCAL_BUNDLE,{ing_tikka:'rcp_tikka_quick'},8);assert.equal(p.gather.find(g=>g.line.ingredient_id==='ing_paneer').line.qty,800)})
test('active concurrency and dependency completion gates',()=>{const steps=execution(LOCAL_BUNDLE,{ing_tikka:'rcp_tikka_baked'},4).steps;let session={id:'test',recipe_id:'rcp_makhani',scheduled_for:new Date().toISOString(),entry_mode:'planned',step_state:{}};const coat=steps.find(s=>s.technique_id==='tech_marinate'),saute=steps.find(s=>s.technique_id==='tech_saute'),rest=steps.find(s=>s.technique_id==='tech_rest');assert(!canStart(rest,steps,session));session=transition(session,steps,coat.step_id,'start','cook');assert(!canStart(saute,steps,session));session=transition(session,steps,coat.step_id,'done','cook');session=transition(session,steps,rest.step_id,'start','cook');assert(canStart(saute,steps,session));assert.equal(session.step_state[coat.step_id].done_by,'cook');assert.throws(()=>transition(session,steps,saute.step_id,'done','cook'),/running/)})
test('resource scheduling never understates critical path',()=>{const steps=execution(LOCAL_BUNDLE,{ing_tikka:'rcp_tikka_quick'},4).steps;assert(estimatedElapsed(steps)>=criticalPath(steps).minutes)})
console.log(`${tests} MOAKA invariant checks passed`)
test('parameter-only duplicate producer rejected',()=>{const b=copy();b.recipes[2].steps=structuredClone(b.recipes[1].steps);b.recipes[2].equipment=b.recipes[1].equipment;assert.throws(()=>normalizeBundle(b),/different step graphs/)})
test('reverse references are not accepted',()=>{const b=copy();b.cooking[0].used_in=['rcp_makhani'];assert.throws(()=>normalizeBundle(b))})
const {restoreSession}=require('../lib/moaka/engine.ts')
test('corrupt local session is rejected',()=>assert.throws(()=>restoreSession({servings:-2,choices:{},instance:{}},LOCAL_BUNDLE)))
async function fallbackChecks(){
 const original=process.env.GEMINI_API_KEY
 delete process.env.GEMINI_API_KEY
 const {suggestMoaka}=require('../lib/moaka/suggest.ts')
 const result=await suggestMoaka('test')
 assert.equal(result.source,'local');normalizeBundle(result.bundle);console.log('PASS missing-key fallback')
 const {GoogleGenAI}=require('@google/genai')
 const descriptor=Object.getOwnPropertyDescriptor(GoogleGenAI.prototype,'models')
 // Invalid-output behavior is tested by replacing the SDK export before reloading the service.
 const sdkPath=require.resolve('@google/genai'),sdk=require.cache[sdkPath],originalExport=sdk.exports
 sdk.exports={GoogleGenAI:class {models={generateContent:async()=>({text:'{"title":"unchecked prose"}'})}}}
 delete require.cache[require.resolve('../lib/moaka/suggest.ts')]
 process.env.GEMINI_API_KEY='test-only-placeholder'
 const invalid=await require('../lib/moaka/suggest.ts').suggestMoaka('test')
 assert.equal(invalid.source,'local');normalizeBundle(invalid.bundle);console.log('PASS invalid-output fallback')
 sdk.exports={GoogleGenAI:class {models={generateContent:async()=>({text:JSON.stringify(LOCAL_BUNDLE)})}}}
 delete require.cache[require.resolve('../lib/moaka/suggest.ts')]
 const valid=await require('../lib/moaka/suggest.ts').suggestMoaka('test')
 assert.equal(valid.source,'gemini');console.log('PASS valid structured model response')
 sdk.exports=originalExport
 if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original
 console.log(`${tests+3} total MOAKA checks passed; no network used`)
}
fallbackChecks().catch(e=>{console.error(e);process.exitCode=1})
