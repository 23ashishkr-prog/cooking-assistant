import type { RecipeItem } from '@/components/cooking-assistant-app'

export type Technique = { id: string; name: string; kind: 'prep' | 'cooking' | 'sensory' | 'equipment'; guidance: string }
export const TECHNIQUES: Record<string, Technique> = {
  rinse: { id: 'rinse', name: 'Rinse flattened rice', kind: 'prep', guidance: 'Rinse briefly in a sieve, then drain. Thick poha should soften without turning mushy; sprinkle more water only if still firm.' },
  temper: { id: 'temper', name: 'Temper spices', kind: 'cooking', guidance: 'Use medium heat. Add mustard seeds to warm oil and let them pop; reduce the heat if the oil smokes.' },
  soften: { id: 'soften', name: 'Check onion texture', kind: 'sensory', guidance: 'The onion should look translucent and feel soft under a spatula, without dark or burnt edges.' },
  pan: { id: 'pan', name: 'Choose a wide pan', kind: 'equipment', guidance: 'Use a wide, heavy pan with a lid. For larger batches, use a larger pan or cook in batches so the food heats evenly.' },
}
export const INGREDIENTS: Record<string, { id: string; name: string; aliases: string[] }> = Object.fromEntries([
  ['poha', 'Thick flattened rice', 'poha,beaten rice'], ['onion', 'Onion', 'pyaz'], ['oil', 'Oil', ''],
  ['mustard', 'Mustard seeds', 'rai'], ['turmeric', 'Turmeric', 'haldi'], ['salt', 'Salt', ''],
  ['lemon', 'Lemon juice', ''], ['peas', 'Green peas', 'matar'], ['coriander', 'Fresh coriander', 'cilantro'],
].map(([id, name, aliases]) => [id, { id, name, aliases: aliases ? aliases.split(',') : [] }]))

export type RecipeIngredient = { ingredientId: string; amount: number; unit: string; role: 'main' | 'aromatic' | 'fat' | 'spice' | 'seasoning' | 'finish'; scaling: 'linear' | 'to-taste'; preparation?: string }
export type RecipeStep = { id: string; action: string; instruction: string; ingredientIds: string[]; dependsOn: string[]; techniqueIds: string[]; durationSeconds: number; cue: string; parallelWith?: string[] }
export type RecipeObject = { id: string; name: string; description: string; servings: number; minutes: number; meal: string; diet: string; ingredients: RecipeIngredient[]; steps: RecipeStep[] }

const pohaIngredients: RecipeIngredient[] = [
  { ingredientId: 'poha', amount: 150, unit: 'g', role: 'main', scaling: 'linear' },
  { ingredientId: 'onion', amount: 1, unit: 'medium', role: 'aromatic', scaling: 'linear', preparation: 'finely chopped' },
  { ingredientId: 'oil', amount: 1, unit: 'tbsp', role: 'fat', scaling: 'linear' },
  { ingredientId: 'mustard', amount: 0.5, unit: 'tsp', role: 'spice', scaling: 'linear' },
  { ingredientId: 'turmeric', amount: 0.25, unit: 'tsp', role: 'spice', scaling: 'linear' },
  { ingredientId: 'salt', amount: 0.5, unit: 'tsp', role: 'seasoning', scaling: 'to-taste' },
  { ingredientId: 'lemon', amount: 1, unit: 'tbsp', role: 'finish', scaling: 'to-taste' },
  { ingredientId: 'coriander', amount: 2, unit: 'tbsp', role: 'finish', scaling: 'linear', preparation: 'chopped' },
]
const pohaSteps: RecipeStep[] = [
  { id: 'rinse', action: 'Soften the poha', instruction: 'Rinse the poha briefly in a sieve and leave it to drain.', ingredientIds: ['poha'], dependsOn: [], techniqueIds: ['rinse'], durationSeconds: 180, cue: 'A flake presses soft between your fingers but keeps its shape.', parallelWith: ['chop'] },
  { id: 'chop', action: 'Chop the onion', instruction: 'Finely chop the onion on a stable cutting board.', ingredientIds: ['onion'], dependsOn: [], techniqueIds: [], durationSeconds: 120, cue: 'Pieces are small and evenly sized.', parallelWith: ['rinse'] },
  { id: 'temper', action: 'Temper the mustard seeds', instruction: 'Warm the oil in a wide pan over medium heat, then add the mustard seeds.', ingredientIds: ['oil', 'mustard'], dependsOn: ['chop'], techniqueIds: ['temper', 'pan'], durationSeconds: 60, cue: 'The seeds pop gently; the oil is not smoking.' },
  { id: 'onion', action: 'Soften the onion', instruction: 'Add the chopped onion and stir over medium heat.', ingredientIds: ['onion'], dependsOn: ['temper', 'chop'], techniqueIds: ['soften'], durationSeconds: 300, cue: 'The onion is soft and translucent.' },
  { id: 'season', action: 'Stir in the seasoning', instruction: 'Stir turmeric and a little salt into the softened onion.', ingredientIds: ['turmeric', 'salt'], dependsOn: ['onion'], techniqueIds: [], durationSeconds: 20, cue: 'The onion is evenly yellow and the spice is fragrant.' },
  { id: 'steam', action: 'Steam the poha', instruction: 'Fold in the drained poha. Cover and warm over low heat; sprinkle a little water if dry.', ingredientIds: ['poha'], dependsOn: ['rinse', 'season'], techniqueIds: ['pan'], durationSeconds: 180, cue: 'The flakes are hot and tender, separate rather than mushy.' },
  { id: 'finish', action: 'Finish with lemon and herbs', instruction: 'Turn off the heat and fold in lemon juice and coriander. Taste before adding more salt or lemon.', ingredientIds: ['lemon', 'coriander'], dependsOn: ['steam'], techniqueIds: [], durationSeconds: 30, cue: 'The poha tastes bright and balanced.' },
]
export const RECIPE_LIBRARY: RecipeObject[] = [
  { id: 'library-lemon-poha', name: 'Lemon & coriander poha', description: 'Soft, separate rice flakes with sweet onion and a bright lemon finish.', servings: 2, minutes: 20, meal: 'Breakfast', diet: 'Vegan', ingredients: pohaIngredients, steps: pohaSteps },
  { id: 'library-pea-poha', name: 'Green pea poha', description: 'A comforting breakfast with tender peas, mustard seeds and fresh herbs.', servings: 2, minutes: 25, meal: 'Breakfast', diet: 'Vegan', ingredients: [...pohaIngredients, { ingredientId: 'peas', amount: 100, unit: 'g', role: 'main', scaling: 'linear', preparation: 'frozen' }], steps: [...pohaSteps.slice(0, 4), { id: 'peas', action: 'Cook the peas', instruction: 'Add frozen peas with a splash of water. Cover and cook over medium-low heat.', ingredientIds: ['peas'], dependsOn: ['onion'], techniqueIds: ['pan'], durationSeconds: 240, cue: 'The peas are hot throughout and tender when pressed.' }, { ...pohaSteps[4], dependsOn: ['peas'] }, ...pohaSteps.slice(5)] },
]

// UI-facing views of the canonical libraries. These preserve the compact
// authoring objects above while giving Cook Mode a uniform presentation shape.
export const ingredientLibrary = Object.values(INGREDIENTS).map((ingredient) => ({
  ...ingredient,
  synonyms: ingredient.aliases,
  substitutes: [] as string[],
}))

export const techniqueLibrary = Object.values(TECHNIQUES).map((technique) => ({
  ...technique,
  explanation: technique.guidance,
}))

export const recipeObjects = RECIPE_LIBRARY.map((recipe) => ({
  ...recipe,
  baseServings: recipe.servings,
  steps: recipe.steps.map((step, index) => ({
    id: step.id,
    step_number: index + 1,
    title: step.action,
    instruction: step.instruction,
    ingredientIds: step.ingredientIds,
    techniqueIds: step.techniqueIds,
    dependsOn: step.dependsOn,
    parallelWith: step.parallelWith,
    duration_seconds: step.durationSeconds,
    visual_check: step.cue,
  })),
}))
export function ingredientLabel(item: RecipeIngredient, servings: number, baseServings: number): string {
  const amount = Math.round(item.amount * servings / baseServings * 100) / 100
  return `${amount} ${item.unit} ${INGREDIENTS[item.ingredientId].name}${item.preparation ? `, ${item.preparation}` : ''}${item.scaling === 'to-taste' ? ' (guide; adjust to taste)' : ''}`
}

export function ingredientAmount(item: RecipeIngredient, servings: number, baseServings: number): string {
  return ingredientLabel(item, servings, baseServings)
}
export function toCookingRecipe(recipe: RecipeObject, servings: number): RecipeItem {
  return {
    id: recipe.id, name: recipe.name, description: recipe.description, image_url: null, meal_type: recipe.meal.toLowerCase(), prep_time: 5, cook_time: recipe.minutes - 5, servings,
    ingredients: recipe.ingredients.map(item => ({ name: INGREDIENTS[item.ingredientId].name, quantity: ingredientLabel(item, servings, recipe.servings) })),
    stepsList: recipe.steps.map((step, index) => ({
      id: step.id, step_number: index + 1, title: step.action, instruction: step.instruction, duration_seconds: step.durationSeconds, visual_check: step.cue,
      stepIngredients: step.ingredientIds.map(id => ingredientLabel(recipe.ingredients.find(item => item.ingredientId === id)!, servings, recipe.servings)),
      techniques: step.techniqueIds.map(id => TECHNIQUES[id]),
      prerequisites: step.dependsOn.map(id => recipe.steps.find(s => s.id === id)!.action),
      parallelContext: step.parallelWith?.map(id => recipe.steps.find(s => s.id === id)!.action),
    })),
  }
}
