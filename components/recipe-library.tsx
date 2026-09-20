'use client'

import { useState } from 'react'
import { ingredientAmount, ingredientLibrary, recipeObjects, techniqueLibrary } from '@/lib/recipe-library'
import type { RecipeItem } from './cooking-assistant-app'

export function RecipeLibrary({ onCook }: { onCook: (recipe: RecipeItem) => void }) {
  const [servings, setServings] = useState(2)
  const [query, setQuery] = useState('')
  const recipe = recipeObjects[0]
  const ingredients = recipe.ingredients.map(item => ({ ...item, name: ingredientLibrary.find(i => i.id === item.ingredientId)!.name, amount: ingredientAmount(item, servings, recipe.baseServings) }))
  return <section className="space-y-5">
    <div className="rounded-3xl border border-[#ded9cf] bg-white p-6 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">MOAKA • Recipe Library</p>
      <h1 className="font-serif text-3xl font-bold">Recipes you can understand</h1>
      <p className="text-sm text-[#736e65]">Explore ingredients, techniques and the order of cooking, then follow one action at a time.</p>
      <h2 className="font-serif text-xl font-bold">{recipe.name}</h2><p className="text-sm">{recipe.description}</p>
      <label className="flex items-center gap-3 text-sm">Servings<select value={servings} onChange={e => setServings(Number(e.target.value))} className="rounded-lg border p-2">{[1, 2, 4, 6, 8].map(n => <option key={n}>{n}</option>)}</select></label>
      <ul className="space-y-2 text-sm">{ingredients.map(i => <li key={i.ingredientId}><strong>{i.name}</strong> · {i.amount} <span className="text-[#736e65]">({i.role})</span></li>)}</ul>
      <p className="text-xs text-[#736e65]">Main ingredients scale with servings. Salt is adjusted by taste; oil depends on pan size. Cooking time stays a guide—use the doneness cues.</p>
      <button className="rounded-xl bg-[#223129] px-5 py-3 font-bold text-white" onClick={() => onCook({ id: recipe.id, name: recipe.name, description: recipe.description, image_url: null, meal_type: 'dinner', prep_time: 5, cook_time: 15, servings, ingredients, stepsList: recipe.steps, localOnly: true })}>Cook {servings} servings</button>
    </div>
    <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">Step dependencies</summary><ol className="mt-3 space-y-3 text-sm">{recipe.steps.map(step => <li key={step.id}><strong>{step.step_number}. {step.title}</strong><p>After: {step.dependsOn?.map(id => recipe.steps.find(s => s.id === id)?.title).join(', ') || 'Ready to start'}</p>{!!step.parallelWith?.length && <p>Can prepare alongside: {step.parallelWith.map(id => recipe.steps.find(s => s.id === id)?.title).join(', ')}</p>}</li>)}</ol></details>
    <div className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="text-xl font-serif font-bold">Ingredient identities</h2><label className="block text-sm">Find an ingredient or synonym<input value={query} onChange={e => setQuery(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="Try chana or jeera" /></label>{ingredientLibrary.filter(i => [i.name, ...i.synonyms].join(' ').toLowerCase().includes(query.toLowerCase())).map(i => <div key={i.id} className="border-t pt-3 text-sm"><strong>{i.name}</strong><p>Also called: {i.synonyms.join(', ')}</p><p>Substitutes: {i.substitutes.join('; ')}</p><code className="text-xs text-[#736e65]">{i.id}</code></div>)}</div>
    <div className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="text-xl font-serif font-bold">Technique libraries</h2>{['prep', 'cooking', 'sensory', 'equipment'].map(kind => <div key={kind}><h3 className="font-bold capitalize">{kind}</h3>{techniqueLibrary.filter(t => t.kind === kind).map(t => <details key={t.id} className="py-2 text-sm"><summary className="cursor-pointer">{t.name}</summary><p className="mt-2 text-[#736e65]">{t.explanation}</p></details>)}</div>)}</div>
  </section>
}
