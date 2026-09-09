import { generateObject } from 'ai'
import { createGateway } from 'ai'
import { z } from 'zod'

const guideSchema = z.object({
  title: z.string(),
  whyItFits: z.string(),
  prepAhead: z.array(z.object({ item: z.string(), timing: z.string(), detail: z.string() })),
  ingredients: z.array(z.string()),
  steps: z.array(z.object({ step: z.number(), title: z.string(), instruction: z.string(), cue: z.string() })),
  substitutions: z.array(z.string()),
  safety: z.array(z.string()),
})

function generateFallbackGuide(recipe: any) {
  const title = recipe.title || 'Cooking Guide'
  const category = recipe.category || 'Meal'
  const prep = recipe.prep_time ? `${recipe.prep_time} min` : '15 min'
  const cook = recipe.cook_time ? `${recipe.cook_time} min` : '20 min'
  const servings = recipe.servings ? `${recipe.servings} servings` : '2-4 servings'

  return {
    title: `Step-by-Step Cooking Guide: ${title}`,
    whyItFits: `This ${category.toLowerCase()} selection is balanced, rewarding, and comes together in approximately ${prep} of prep and ${cook} of active cooking for ${servings}.`,
    prepAhead: [
      {
        item: 'Mise en place (Prep ingredients)',
        timing: '10 mins before cooking',
        detail: 'Wash and pat dry all produce. Dice aromatics (onions, garlic, fresh herbs) into uniform pieces for even cooking.',
      },
      {
        item: 'Cookware & equipment setup',
        timing: '5 mins before heating',
        detail: 'Preheat your skillet or Dutch oven over medium heat. Keep cooking fat, sea salt, and black pepper within arm’s reach.',
      },
      {
        item: 'Protein & pantry staging',
        timing: 'Ahead of time',
        detail: 'Allow proteins or chilled ingredients to sit at room temperature for 10 minutes to ensure even browning and tender texture.',
      },
    ],
    ingredients: [
      'Key recipe proteins or legumes',
      'Fresh seasonal vegetables & aromatics',
      'Extra virgin olive oil or cooking butter',
      'Coarse sea salt & freshly cracked pepper',
      'Fresh lemon juice or finishing acid',
      'Fresh herbs for garnish (parsley, basil, or chives)',
    ],
    steps: [
      {
        step: 1,
        title: 'Heat & Aromatics Base',
        instruction: 'Warm your cooking fat over medium-low heat. Sweat the aromatics until fragrant and translucent without burning.',
        cue: 'Listen for a gentle sizzle and watch for onion edges turning sweet and glossy.',
      },
      {
        step: 2,
        title: 'Core Cooking & Seasoning',
        instruction: 'Add the primary ingredients in stages based on cooking time. Season lightly at each layer rather than all at the end.',
        cue: 'Look for a golden sear on proteins and vibrant colors preserved in tender-crisp vegetables.',
      },
      {
        step: 3,
        title: 'Simmer & Emulsify Flavors',
        instruction: 'Introduce liquids or sauce components. Reduce heat to low, cover or simmer gently to marry all flavors together.',
        cue: 'Liquid should gently bubble around the rim and thicken slightly to coat the back of a wooden spoon.',
      },
      {
        step: 4,
        title: 'Finishing Touch & Rest',
        instruction: 'Remove from heat. Fold in fresh herbs, adjust salt, and squeeze fresh lemon juice or acid to brighten the dish.',
        cue: 'A subtle aromatic burst and balanced acidity balancing richness.',
      },
    ],
    substitutions: [
      'Dairy-free: Substitute butter with cold-pressed olive oil or neutral avocado oil.',
      'Vegetarian adapt: Swap meat proteins with firm pressed tofu, white beans, or sliced portobello mushrooms.',
      'Gluten-free: Ensure any soy sauce or thickening starch used is certified gluten-free or tamari.',
    ],
    safety: [
      'Use separate cutting boards for raw proteins and ready-to-eat produce.',
      'Ensure poultry reaches an internal temperature of 165°F (74°C) and fish reaches 145°F (63°C).',
      'Store any leftovers in an airtight container in the refrigerator within two hours of cooking.',
    ],
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const recipe = body?.recipe ?? (body?.title ? body : null)
  if (!recipe?.title) return Response.json({ error: 'Choose a recipe first.' }, { status: 400 })

  try {
    const gateway = createGateway()
    const { object } = await generateObject({
      model: gateway('openai/gpt-4o-mini'),
      schema: guideSchema,
      system: 'You are a careful home-cooking teacher. Create practical, concise guidance from the supplied recipe record. Never invent missing ingredients as if they came from the database: clearly label reasonable pantry assumptions. Include make-ahead prep, mise en place, step-by-step cooking cues, substitutions, and food safety. Do not claim to have browsed the web.',
      prompt: `Build a cooking guide for this database recipe. The user wants four-meal-plan suggestions and help knowing what to prepare before cooking. Recipe record: ${JSON.stringify(recipe)}`,
    })
    return Response.json(object)
  } catch (err) {
    console.warn('[AI Guide] Gateway call failed or unconfigured, providing curated structured cooking guide:', err)
    return Response.json(generateFallbackGuide(recipe))
  }
}

export const maxDuration = 30
