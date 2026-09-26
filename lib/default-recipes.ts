import type { RecipeItem } from '@/components/cooking-assistant-app'

const step = (step_number: number, title: string, instruction: string, duration_seconds: number, tip: string) => ({
  step_number,
  title,
  instruction,
  duration_seconds,
  visual_check: 'The texture, color, and aroma match the instruction before continuing.',
  tip,
})

export const DEFAULT_RECIPES: RecipeItem[] = [
  {
    id: 'default-poha', name: 'Poha', title: 'Poha',
    description: 'Light flattened rice with onions, peas, lemon, and fresh coriander.', image_url: null,
    meal_type: 'breakfast', category: 'Breakfast', cuisine: 'Indian', diet_type: 'Vegetarian', difficulty: 'Easy',
    prep_time: 10, cook_time: 15, total_time: 25, servings: 4,
    ingredients: [
      { name: 'Flattened rice (poha)', quantity: '2', unit: 'cups' }, { name: 'Onion', quantity: '1', unit: 'small, diced' },
      { name: 'Green peas', quantity: '1/2', unit: 'cup' }, { name: 'Mustard seeds', quantity: '1', unit: 'tsp' },
      { name: 'Turmeric', quantity: '1/2', unit: 'tsp' }, { name: 'Lemon juice', quantity: '1', unit: 'tbsp' },
      { name: 'Coriander', quantity: '1/4', unit: 'cup' },
    ],
    stepsList: [
      step(1, 'Rinse and rest poha', 'Rinse poha under cool water until softened but still holding its shape. Drain and rest for 5 minutes.', 300, 'Do not soak poha or it will become mushy.'),
      step(2, 'Temper the aromatics', 'Heat oil over medium heat. Add mustard seeds, then onion and peas. Cook until the onion turns translucent.', 360, 'The mustard seeds should pop gently, not burn.'),
      step(3, 'Season and steam', 'Stir in turmeric, salt, and the rested poha. Cover and steam on low heat until hot throughout.', 300, 'Fold gently to keep the grains fluffy.'),
      step(4, 'Finish and serve', 'Turn off the heat. Fold through lemon juice and coriander, then serve warm.', 120, 'Taste for salt and acidity just before serving.'),
    ],
  },
  {
    id: 'default-rajma-masala', name: 'Rajma Masala', title: 'Rajma Masala',
    description: 'Slow-simmered kidney beans in a rich tomato and warming spice gravy.', image_url: null,
    meal_type: 'lunch', category: 'Lunch', cuisine: 'North Indian', diet_type: 'Vegetarian', difficulty: 'Easy',
    prep_time: 15, cook_time: 35, total_time: 50, servings: 4,
    ingredients: [
      { name: 'Cooked kidney beans', quantity: '3', unit: 'cups' }, { name: 'Tomatoes', quantity: '2', unit: 'large, pureed' },
      { name: 'Onion', quantity: '1', unit: 'large, diced' }, { name: 'Ginger-garlic paste', quantity: '1', unit: 'tbsp' },
      { name: 'Cumin seeds', quantity: '1', unit: 'tsp' }, { name: 'Garam masala', quantity: '1', unit: 'tsp' },
      { name: 'Coriander', quantity: '1/4', unit: 'cup' },
    ],
    stepsList: [
      step(1, 'Build the masala base', 'Heat oil and bloom cumin seeds. Sauté onion until golden, then add ginger-garlic paste.', 600, 'Golden onion creates the depth of the gravy.'),
      step(2, 'Cook the tomato masala', 'Add tomato puree, turmeric, chilli, and salt. Cook until the oil separates from the masala.', 720, 'The mixture should look glossy and no longer smell raw.'),
      step(3, 'Simmer the beans', 'Add kidney beans and enough water to make a thick gravy. Simmer gently so the beans absorb the spices.', 600, 'Press a few beans against the pan to naturally thicken the sauce.'),
      step(4, 'Finish with spices', 'Stir in garam masala and coriander. Rest for 2 minutes before serving with rice.', 120, 'A small splash of lemon balances the richness.'),
    ],
  },
  {
    id: 'default-masala-chai-pakoras', name: 'Masala Chai & Pakoras', title: 'Masala Chai & Pakoras',
    description: 'Spiced milk tea paired with crisp, golden vegetable fritters.', image_url: null,
    meal_type: 'high_tea', category: 'High Tea', cuisine: 'Indian', diet_type: 'Vegetarian', difficulty: 'Easy',
    prep_time: 10, cook_time: 20, total_time: 30, servings: 4,
    ingredients: [
      { name: 'Gram flour', quantity: '1', unit: 'cup' }, { name: 'Mixed vegetables', quantity: '2', unit: 'cups, sliced' },
      { name: 'Tea leaves', quantity: '2', unit: 'tsp' }, { name: 'Milk', quantity: '2', unit: 'cups' },
      { name: 'Ginger', quantity: '1', unit: 'inch, crushed' }, { name: 'Cardamom', quantity: '3', unit: 'pods' },
    ],
    stepsList: [
      step(1, 'Mix the pakora batter', 'Combine gram flour, salt, chilli, and water into a thick batter. Fold in the sliced vegetables.', 300, 'The batter should cling to vegetables without running.'),
      step(2, 'Fry until crisp', 'Heat oil over medium heat. Drop small portions of batter and fry until deeply golden, turning once.', 600, 'Keep batches small so the oil stays hot.'),
      step(3, 'Brew the chai', 'Simmer water with ginger and cardamom. Add tea, milk, and sugar, then simmer until fragrant.', 480, 'Do not boil the milk aggressively.'),
      step(4, 'Drain and serve', 'Drain pakoras on a rack or paper towel. Strain chai and serve immediately.', 120, 'Serve pakoras while crisp with chutney.'),
    ],
  },
  {
    id: 'default-palak-paneer', name: 'Palak Paneer', title: 'Palak Paneer',
    description: 'Tender paneer in a silky spinach gravy finished with fragrant spices.', image_url: null,
    meal_type: 'dinner', category: 'Dinner', cuisine: 'North Indian', diet_type: 'Vegetarian', difficulty: 'Easy',
    prep_time: 15, cook_time: 25, total_time: 40, servings: 4,
    ingredients: [
      { name: 'Spinach', quantity: '500', unit: 'g' }, { name: 'Paneer', quantity: '300', unit: 'g, cubed' },
      { name: 'Onion', quantity: '1', unit: 'medium, diced' }, { name: 'Tomato', quantity: '1', unit: 'diced' },
      { name: 'Ginger-garlic paste', quantity: '1', unit: 'tbsp' }, { name: 'Garam masala', quantity: '1/2', unit: 'tsp' },
    ],
    stepsList: [
      step(1, 'Blanch the spinach', 'Blanch spinach briefly in boiling water, then cool in ice water and blend into a smooth puree.', 300, 'Cooling immediately keeps the green color bright.'),
      step(2, 'Prepare the gravy', 'Sauté onion until soft. Add ginger-garlic paste and tomato, cooking until the tomato breaks down.', 480, 'The aromatics should smell sweet and cooked.'),
      step(3, 'Simmer spinach and paneer', 'Add spinach puree and a splash of water. Simmer gently, then fold in paneer cubes.', 600, 'Avoid a hard boil to preserve the spinach color.'),
      step(4, 'Season and rest', 'Add garam masala and a little cream if desired. Rest briefly and serve with roti or rice.', 120, 'Finish with lemon only if the spinach needs brightness.'),
    ],
  },
]

export function withDefaultRecipes(recipes: RecipeItem[]): RecipeItem[] {
  const byMealType = new Map(recipes.map((recipe) => [recipe.meal_type, recipe]))
  return DEFAULT_RECIPES.map((fallback) => byMealType.get(fallback.meal_type) || fallback)
}
