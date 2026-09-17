const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function load(file, overrides = {}, env = {}) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(source, { exports, Buffer, URL, console, process: { env }, require(name) {
    if (name in overrides) return overrides[name]
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', overrides, env)
    return require(name)
  } })
  return exports
}
const policy = load('lib/recipe-image-policy.ts')
test('repair includes every generic fallback and duplicate, skips unique images', () => {
  const rows = [{id:'a',image_url:'/recipe-fallback-indian.webp'}, {id:'b',image_url:null},
    {id:'c',image_url:'https://example.com/shared.jpg'}, {id:'d',image_url:'https://example.com/shared.jpg'},
    {id:'e',image_url:'https://example.com/unique.jpg'}]
  assert.equal(policy.imageRepairTargets(rows).map(r=>r.id).join(','), 'a,b,c,d')
  assert.equal(policy.imageRepairTargets([rows[0]]).length, 1)
})
function fixture({url='/recipe-fallback-indian.webp', uploadFails=false, updateFails=false}={}) {
  const events=[]
  const recipe={id:'appam',name:'Appam',image_url:url}
  let updating=false
  const query={select(){return this},eq(){return this},update(value){events.push('update'); updating=true; recipe.image_url=value.image_url;return this},
    async single(){return updating ? {data:updateFails?null:{id:'appam'},error:updateFails?{message:'DB failed'}:null} : {data:recipe,error:null}}}
  const client={from:()=>query,storage:{listBuckets:async()=>({data:[{id:'recipe-images'}]}),from:()=>({
    upload:async()=>{events.push('upload');return {error:uploadFails?{message:'Upload failed'}:null}},
    getPublicUrl:p=>({data:{publicUrl:`https://storage.example/recipe-images/${p}`}}),
  })}}
  const generator=load('lib/recipe-image-generation.ts',{
    '@/lib/supabase/server':{createAdminClient:()=>client},
    '@google/genai':{GoogleGenAI:class {models={generateContent:async()=>{events.push('generate');return {candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from('test image bytes').toString('base64')}}]}}]}}}}},
  },{GEMINI_API_KEY:'test-only'})
  return {events,recipe,run:()=>generator.generateAndStoreRecipeImage('appam')}
}
test('generic image is generated, uploaded, and saved in that order',async()=>{
  const f=fixture();const url=await f.run()
  assert.equal(f.events.join(','),'generate,upload,update')
  assert.match(url,/appam-[a-f0-9]{16}\.png$/)
  assert.equal(f.recipe.image_url,url)
})
test('stored image is reused without AI or storage calls',async()=>{
  const f=fixture({url:'https://storage.example/appam.png'})
  assert.equal(await f.run(),'https://storage.example/appam.png');assert.equal(f.events.length,0)
})
test('upload failure never updates recipe',async()=>{
  const f=fixture({uploadFails:true});await assert.rejects(f.run(),/Upload failed/)
  assert.equal(f.events.join(','),'generate,upload')
})
test('database failure is reported rather than claiming saved',async()=>{
  const f=fixture({updateFails:true});await assert.rejects(f.run(),/DB failed/)
})
test('repair endpoint denies public generation',async()=>{
  const route=load('app/api/recipes/image/route.ts',{
    '@/lib/supabase/server':{createAdminClient:()=>{throw Error('must not access DB')}},
    '@/lib/recipe-image-generation':{generateAndStoreRecipeImage:()=>{throw Error('must not generate')}},
  },{RECIPE_IMAGE_REPAIR_SECRET:'test-only'})
  const response=await route.POST(new Request('http://localhost/api/recipes/image',{method:'POST'}))
  assert.equal(response.status,401)
})
test('card renders stored image and never makes generation requests',()=>{
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server')
  const {RecipeImage}=load('components/recipe-image.tsx')
  const html=renderToStaticMarkup(React.createElement(RecipeImage,{recipe:{id:'a',name:'Appam',image_url:'https://example.com/appam.png'}}))
  assert.match(html,/src="https:\/\/example.com\/appam.png"/)
  const missing=renderToStaticMarkup(React.createElement(RecipeImage,{recipe:{id:'a',name:'Appam',image_url:'/recipe-fallback-indian.webp'}}))
  assert.doesNotMatch(missing,/Preparing|Retry|<img/)
})
test('GET with missing photo does not trigger AI generation',async()=>{
  const query={select(){return this},eq(){return this},async single(){return {data:{image_url:'/recipe-fallback-indian.webp'}}}}
  const route=load('app/api/recipes/image/route.ts',{
    '@/lib/supabase/server':{createAdminClient:()=>({from:()=>query})},
    '@/lib/recipe-image-generation':{generateAndStoreRecipeImage:()=>{throw Error('GET must never generate')}},
  })
  const {NextRequest}=require('next/server')
  assert.equal((await route.GET(new NextRequest('http://localhost/api/recipes/image?recipeId=appam'))).status,404)
})
