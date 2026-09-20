import { readFileSync } from 'node:fs'

const [inputPath, startValue = '0', countValue = '20'] = process.argv.slice(2)
if (!inputPath) throw new Error('Usage: node build_recipe_import_sql.mjs <recipes.json> [start] [count]')

const allRecipes = JSON.parse(readFileSync(inputPath, 'utf8'))
const recipes = allRecipes.slice(Number(startValue), Number(startValue) + Number(countValue))
const literal = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const json = value => `${literal(JSON.stringify(value))}::jsonb`
const array = values => `array[${(values || []).map(literal).join(',')}]::text[]`

const statements = ['begin;']
for (const recipe of recipes) {
  statements.push(`insert into public.recipes (
    id, external_id, source_name, source_url, attribution, name, title, description, image_url,
    meal_type, category, cuisine, diet_type, difficulty, prep_time_minutes, cook_time_minutes,
    default_servings, calories, nutrition_score, tips, tags, ingredients, instructions, published
  ) values (
    ${literal(recipe.id)}, ${literal(recipe.external_id)}, ${literal(recipe.source_name)}, ${literal(recipe.source_url)},
    ${literal(recipe.attribution)}, ${literal(recipe.name)}, ${literal(recipe.title)}, ${literal(recipe.description)},
    ${literal(recipe.image_url)}, ${literal(recipe.meal_type)}, ${literal(recipe.category)}, ${literal(recipe.cuisine)},
    ${literal(recipe.diet_type)}, ${literal(recipe.difficulty)}, ${Number(recipe.prep_time_minutes)},
    ${Number(recipe.cook_time_minutes)}, ${Number(recipe.default_servings)}, ${recipe.calories ?? 'null'},
    ${recipe.nutrition_score ?? 'null'}, ${literal(recipe.tips)}, ${array(recipe.tags)}, ${json(recipe.ingredients)},
    ${json(recipe.instructions)}, true
  ) on conflict (id) do update set
    source_url=excluded.source_url, name=excluded.name, title=excluded.title, description=excluded.description,
    image_url=excluded.image_url, meal_type=excluded.meal_type, category=excluded.category,
    cuisine=excluded.cuisine, diet_type=excluded.diet_type, ingredients=excluded.ingredients,
    instructions=excluded.instructions, published=true, updated_at=now();`)

  statements.push(`delete from public.recipe_ingredients where recipe_id=${literal(recipe.id)};`)
  if (recipe.ingredients.length) {
    statements.push(`insert into public.recipe_ingredients (recipe_id, ingredient_name, normalized_name, preparation_note, sequence)
      values ${recipe.ingredients.map(item => `(${literal(recipe.id)},${literal(item.name)},${literal(item.normalized_name)},${literal(item.measure)},${Number(item.sequence)})`).join(',')};`)
  }

  statements.push(`delete from public.recipe_steps where recipe_id=${literal(recipe.id)};`)
  if (recipe.instructions.length) {
    statements.push(`insert into public.recipe_steps (recipe_id, step_number, title, instruction)
      values ${recipe.instructions.map((step, index) => `(${literal(recipe.id)},${index + 1},${literal(`Step ${index + 1}`)},${literal(step)})`).join(',')};`)
  }
}
statements.push('commit;')
process.stdout.write(statements.join('\n'))
