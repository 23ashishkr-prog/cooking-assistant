'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Globe,
  LoaderCircle,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Utensils,
  X,
  Flame,
  CheckCircle2,
  BookmarkCheck,
  Layers,
} from 'lucide-react'
import type { Recipe } from '@/lib/supabase/server'

type Guide = {
  title: string
  whyItFits: string
  prepAhead: { item: string; timing: string; detail: string }[]
  ingredients: string[]
  steps: { step: number; title: string; instruction: string; cue: string }[]
  substitutions: string[]
  safety: string[]
}

type MealType = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'dessert'

const mealTypes: { id: MealType; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'all', label: 'All Recipes', description: 'Explore full collection', icon: Layers },
  { id: 'breakfast', label: 'Breakfast', description: 'Start the day well', icon: Sun },
  { id: 'lunch', label: 'Lunch', description: 'Satisfying midday fuel', icon: Utensils },
  { id: 'dinner', label: 'Dinner', description: 'Slow down & gather', icon: Moon },
  { id: 'dessert', label: 'Dessert', description: 'Sweet culinary finish', icon: Sparkles },
]

const QUICK_SEARCHES = ['Authentic Tonkotsu Ramen', 'Butter Chicken Masala', 'Baja Fish Tacos', 'Crispy Falafel Bowl', 'Classic Tiramisu']

export function MealPlanner({ initialRecipes }: { initialRecipes: Recipe[] }) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [mealType, setMealType] = useState<MealType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(initialRecipes[0] || null)
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loadingGuide, setLoadingGuide] = useState(false)
  const [searchingInternet, setSearchingInternet] = useState(false)
  const [internetStatus, setInternetStatus] = useState<string | null>(null)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({})
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})
  const [, startTransition] = useTransition()

  // Filter recipes based on active meal type and search query
  const filteredRecipes = useMemo(() => {
    let list = recipes
    if (mealType !== 'all') {
      list = list.filter((r) => {
        const val = `${r.category ?? ''} ${r.title} ${r.description ?? ''}`.toLowerCase()
        return val.includes(mealType)
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const val = `${r.title} ${r.description ?? ''} ${r.category ?? ''} ${(r.ingredients || []).join(' ')}`.toLowerCase()
        return val.includes(q)
      })
    }
    return list
  }, [recipes, mealType, searchQuery])

  async function createGuide(recipe: Recipe) {
    setSelectedRecipe(recipe)
    setGuide(null)
    setCheckedIngredients({})
    setCompletedSteps({})
    setLoadingGuide(true)
    try {
      const response = await fetch('/api/cooking-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recipe, mealType }),
      })
      if (response.ok) {
        const data = await response.json()
        setGuide(data)
      }
    } catch (err) {
      console.error('Failed to create guide:', err)
    } finally {
      setLoadingGuide(false)
    }
  }

  async function searchInternetAndStore(queryToSearch?: string) {
    const q = (queryToSearch || searchQuery).trim()
    if (!q) return

    setSearchingInternet(true)
    setInternetStatus(`Searching internet for "${q}"...`)

    try {
      const res = await fetch('/api/recipes/search-internet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      const data = await res.json()
      if (res.ok && data.recipe) {
        setInternetStatus(data.message || `Recipe saved to your Supabase table!`)
        startTransition(() => {
          setRecipes((prev) => {
            const exists = prev.some((r) => r.id === data.recipe.id || r.title.toLowerCase() === data.recipe.title.toLowerCase())
            return exists ? prev : [data.recipe, ...prev]
          })
          setSelectedRecipe(data.recipe)
        })
        createGuide(data.recipe)
      } else {
        setInternetStatus(data.error || 'Could not find or save recipe from internet.')
      }
    } catch (err: any) {
      setInternetStatus(err.message || 'Error searching internet.')
    } finally {
      setSearchingInternet(false)
      setTimeout(() => setInternetStatus(null), 6000)
    }
  }

  const toggleIngredient = (ing: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [ing]: !prev[ing] }))
  }

  const toggleStep = (stepNum: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }))
  }

  return (
    <section id="cooking-companion" className="border-b border-[#ded9cf] bg-[#223129] px-6 py-12 text-[#f8f6f1] lg:px-10 lg:py-16">
      <div className="mx-auto max-w-7xl">
        {/* Header Title with Live Supabase Badge */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#df9776]/20 text-[#df9776]">
                <Flame className="size-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#df9776]">Your Cooking Companion</p>
            </div>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-5xl">
              What are you in the mood to cook?
            </h1>
            <p className="mt-2 text-base text-[#c4cbc3]">
              Search recipes in your Supabase table, or search the internet to discover and store new recipes with step-by-step guides.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-[#e1e7e0]">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected to Supabase ({recipes.length} recipes in table)</span>
          </div>
        </div>

        {/* Primary Search Option in Place of Companion Top */}
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-4 size-5 text-[#df9776]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (filteredRecipes.length === 0 && searchQuery.trim()) {
                      searchInternetAndStore(searchQuery)
                    }
                  }
                }}
                placeholder="Search recipe by name, ingredient, or cuisine in your table..."
                className="w-full rounded-xl bg-white/10 py-3.5 pl-12 pr-10 text-white placeholder:text-white/60 outline-none transition focus:bg-white/15 focus:ring-2 focus:ring-[#df9776]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-white/60 hover:text-white"
                  title="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={searchingInternet || !searchQuery.trim()}
              onClick={() => searchInternetAndStore(searchQuery)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#df9776] px-5 py-3.5 text-sm font-semibold text-[#223129] transition hover:bg-[#ebaa8c] disabled:opacity-50"
            >
              {searchingInternet ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  <span>Searching Web & Storing...</span>
                </>
              ) : (
                <>
                  <Globe className="size-4" />
                  <span>Search Internet & Add</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Search Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 text-xs text-[#c4cbc3]">
            <span className="font-semibold text-white/80">Try searching web:</span>
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term)
                  searchInternetAndStore(term)
                }}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-white/80 transition hover:border-[#df9776] hover:bg-[#df9776]/20 hover:text-white"
              >
                + {term}
              </button>
            ))}
          </div>
        </div>

        {/* Internet Status Notification */}
        {internetStatus && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#df9776]/40 bg-[#df9776]/15 px-4 py-3 text-sm text-[#f8f6f1]">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="size-5 text-[#df9776]" />
              <span>{internetStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => setInternetStatus(null)}
              className="text-white/60 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Meal Type Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {mealTypes.map(({ id, label, icon: Icon }) => {
            const active = mealType === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMealType(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-[#df9776] text-[#223129] shadow-md'
                    : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Interactive Companion Workspace: 2-Column Split */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Left Column: Recipe Selection List */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#df9776]">
                  {mealType === 'all' ? 'Recipe Catalog' : `${mealType} Recipes`}
                </p>
                <h2 className="mt-1 font-serif text-2xl">
                  {searchQuery ? `Search Results` : `Choose a Recipe`}
                </h2>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[#aeb8ae]">
                {filteredRecipes.length} available
              </span>
            </div>

            <div className="mt-4 flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => {
                  const isSelected = selectedRecipe?.id === recipe.id
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => createGuide(recipe)}
                      className={`group flex items-center gap-4 rounded-2xl border p-3.5 text-left transition ${
                        isSelected
                          ? 'border-[#df9776] bg-[#b25537] shadow-lg'
                          : 'border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="size-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <Utensils className="size-6 text-[#df9776]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-lg leading-snug">
                          {recipe.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-[#c4cbc3]">
                          <span className="font-medium text-[#df9776]">{recipe.category ?? 'Recipe'}</span>
                          {recipe.prep_time != null && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock3 className="size-3" />
                                {recipe.prep_time + (recipe.cook_time || 0)} min total
                              </span>
                            </>
                          )}
                          {recipe.difficulty && (
                            <>
                              <span>·</span>
                              <span>{recipe.difficulty}</span>
                            </>
                          )}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="size-5 text-white" />
                      ) : (
                        <ArrowRight className="size-4 opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" />
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
                  <Utensils className="mx-auto size-8 text-[#df9776]" />
                  <h3 className="mt-3 font-serif text-xl">No recipes found for &ldquo;{searchQuery}&rdquo;</h3>
                  <p className="mt-2 text-sm text-[#c4cbc3]">
                    Search the internet to automatically fetch, format, and store this recipe in your Supabase table!
                  </p>
                  <button
                    type="button"
                    disabled={searchingInternet}
                    onClick={() => searchInternetAndStore(searchQuery)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#df9776] px-4 py-2.5 text-xs font-bold text-[#223129] hover:bg-[#ebaa8c]"
                  >
                    <Globe className="size-4" />
                    <span>Search Web for &ldquo;{searchQuery}&rdquo; & Save to Table</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Step-by-Step Cooking Guide with Interactive Checklist */}
          <div className="rounded-3xl bg-[#f8f6f1] p-6 text-[#25231f] shadow-2xl lg:p-8">
            {!selectedRecipe && (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-[#eadbd2] text-[#b25537]">
                  <Sparkles className="size-7" />
                </span>
                <h3 className="mt-5 font-serif text-2xl">Your Cooking Guide Awaits</h3>
                <p className="mt-2 max-w-sm text-sm text-[#6e6a61]">
                  Select any recipe from your table on the left or search the internet to view step-by-step directions and mise en place prep.
                </p>
              </div>
            )}

            {selectedRecipe && (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#ded9cf] pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#b25537]">
                      {selectedRecipe.category || 'Recipe'} · Active Cooking Guide
                    </span>
                    <h3 className="mt-1 font-serif text-3xl leading-tight">
                      {selectedRecipe.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6e6a61]">
                      {selectedRecipe.prep_time != null && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock3 className="size-3.5 text-[#b25537]" /> Prep: {selectedRecipe.prep_time}m
                        </span>
                      )}
                      {selectedRecipe.cook_time != null && (
                        <span className="flex items-center gap-1 font-medium">
                          <Flame className="size-3.5 text-[#b25537]" /> Cook: {selectedRecipe.cook_time}m
                        </span>
                      )}
                      {selectedRecipe.servings != null && (
                        <span>Serves: {selectedRecipe.servings}</span>
                      )}
                      {selectedRecipe.difficulty && (
                        <span className="rounded-full bg-[#eee9df] px-2.5 py-0.5 font-semibold text-[#25231f]">
                          {selectedRecipe.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedRecipe.image_url && (
                    <img
                      src={selectedRecipe.image_url}
                      alt={selectedRecipe.title}
                      className="size-20 shrink-0 rounded-2xl object-cover shadow-md"
                    />
                  )}
                </div>

                {loadingGuide && (
                  <div className="my-10 flex items-center justify-center gap-3 rounded-2xl bg-white p-6 text-sm font-medium text-[#b25537] shadow-sm">
                    <LoaderCircle className="size-5 animate-spin" />
                    <span>Preparing tailored cooking guidance, prep cues, and safety tips...</span>
                  </div>
                )}

                {guide && (
                  <div className="mt-6 flex flex-col gap-7">
                    {/* Why It Fits */}
                    <div className="rounded-2xl bg-[#ede8de] p-4 text-sm leading-relaxed text-[#514d45]">
                      {guide.whyItFits}
                    </div>

                    {/* Ingredients Checklist */}
                    {guide.ingredients?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif text-2xl text-[#25231f]">Mise en Place (Ingredients)</h4>
                          <span className="text-xs text-[#8d887d]">Tap to check off</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {guide.ingredients.map((ing, idx) => {
                            const isChecked = Boolean(checkedIngredients[ing])
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleIngredient(ing)}
                                className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition ${
                                  isChecked
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 line-through'
                                    : 'border-[#e2dcce] bg-white text-[#25231f] hover:border-[#b25537]'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                                    isChecked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[#cfc8bc]'
                                  }`}
                                >
                                  {isChecked && <Check className="size-3" />}
                                </span>
                                <span className="leading-snug">{ing}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Prep Ahead Tasks */}
                    {guide.prepAhead?.length > 0 && (
                      <div>
                        <h4 className="font-serif text-2xl text-[#25231f]">Before You Turn on the Stove</h4>
                        <div className="mt-3 flex flex-col gap-2.5">
                          {guide.prepAhead.map((item, idx) => (
                            <div key={idx} className="rounded-2xl border border-[#ded9cf] bg-white p-3.5">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-[#25231f]">{item.item}</p>
                                <span className="rounded-full bg-[#f7eee9] px-2.5 py-0.5 text-xs font-medium text-[#b25537]">
                                  {item.timing}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-[#6e6a61]">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Cooking */}
                    <div>
                      <h4 className="font-serif text-2xl text-[#25231f]">Step-by-Step Instructions</h4>
                      <ol className="mt-4 flex flex-col gap-4">
                        {guide.steps.map((step) => {
                          const isDone = Boolean(completedSteps[step.step])
                          return (
                            <li
                              key={step.step}
                              onClick={() => toggleStep(step.step)}
                              className={`cursor-pointer rounded-2xl border p-4 transition ${
                                isDone
                                  ? 'border-emerald-200 bg-emerald-50/60'
                                  : 'border-[#ded9cf] bg-white hover:border-[#b25537]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#25352d] text-white'
                                  }`}
                                >
                                  {isDone ? <Check className="size-4" /> : step.step}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className={`text-sm font-semibold ${isDone ? 'line-through text-emerald-900' : 'text-[#25231f]'}`}>
                                      {step.title}
                                    </p>
                                    {isDone && (
                                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                        <CheckCircle2 className="size-3.5" /> Completed
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-[#514d45]">
                                    {step.instruction}
                                  </p>
                                  {step.cue && (
                                    <p className="mt-2 inline-block rounded-lg bg-[#f7eee9] px-2.5 py-1 text-xs font-medium text-[#b25537]">
                                      Sensory cue: {step.cue}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    </div>

                    {/* Substitutions & Notes */}
                    {guide.substitutions?.length > 0 && (
                      <div className="rounded-2xl border border-[#ded9cf] bg-white p-4">
                        <h4 className="text-sm font-bold text-[#25231f]">Smart Substitutions</h4>
                        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-[#6e6a61]">
                          {guide.substitutions.map((sub, idx) => (
                            <li key={idx}>{sub}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Food Safety */}
                    {guide.safety?.length > 0 && (
                      <div className="rounded-2xl border border-[#dfc8bb] bg-[#f7eee9] p-4">
                        <h4 className="text-sm font-bold text-[#8d432d]">Kitchen Safety & Handling</h4>
                        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-[#8d432d]">
                          {guide.safety.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
