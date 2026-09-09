const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.eqrjeuaifgolpakhafod:wPkPNy427nKoR1Ys@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  console.log('Inserting default user profile and food preferences...');
  await client.query(`
    INSERT INTO public.user_profiles (user_id, name, date_of_birth, family_size, cooking_skill, preferred_cooking_time)
    VALUES ('default_user', 'Ashish', '1995-06-15', 4, 'Intermediate', 30)
    ON CONFLICT (user_id) DO UPDATE SET name = 'Ashish', family_size = 4;

    INSERT INTO public.user_food_preferences (user_id, diet_type, spice_level, cuisines, allergies, dislikes, favorite_ingredients, health_preferences)
    VALUES (
      'default_user',
      'Vegetarian / Flexible',
      'Medium',
      '["North Indian", "South Indian", "Italian", "Asian", "Mexican"]'::jsonb,
      '[]'::jsonb,
      '["Bitter gourd"]'::jsonb,
      '["Paneer", "Tomatoes", "Basmati Rice", "Garlic", "Spinach", "Ginger"]'::jsonb,
      '["High Protein", "Fresh Produce", "Low Sugar"]'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;

    DELETE FROM public.kitchen_inventory WHERE user_id = 'default_user';
    INSERT INTO public.kitchen_inventory (user_id, ingredient_name, quantity, unit, expiry_date) VALUES
    ('default_user', 'Yellow Toor Dal', 500, 'g', CURRENT_DATE + INTERVAL '90 days'),
    ('default_user', 'Paneer', 400, 'g', CURRENT_DATE + INTERVAL '5 days'),
    ('default_user', 'Onions', 6, 'pieces', CURRENT_DATE + INTERVAL '14 days'),
    ('default_user', 'Tomatoes', 5, 'pieces', CURRENT_DATE + INTERVAL '7 days'),
    ('default_user', 'Basmati Rice', 1000, 'g', CURRENT_DATE + INTERVAL '180 days'),
    ('default_user', 'Garlic', 2, 'heads', CURRENT_DATE + INTERVAL '20 days'),
    ('default_user', 'Ginger', 150, 'g', CURRENT_DATE + INTERVAL '14 days'),
    ('default_user', 'Green Chillies', 8, 'pieces', CURRENT_DATE + INTERVAL '8 days'),
    ('default_user', 'Ghee / Butter', 250, 'g', CURRENT_DATE + INTERVAL '60 days'),
    ('default_user', 'Cumin Seeds (Jeera)', 100, 'g', CURRENT_DATE + INTERVAL '365 days'),
    ('default_user', 'Potatoes', 4, 'pieces', CURRENT_DATE + INTERVAL '21 days'),
    ('default_user', 'Coriander Leaves', 1, 'bunch', CURRENT_DATE + INTERVAL '4 days');
  `);

  const recipes = [
    {
      id: 'rec-masala-dosa',
      name: 'Crispy Masala Dosa with Potato Masala',
      description: 'Golden fermented rice-lentil crepes filled with spiced turmeric mashed potatoes, served with fresh coconut chutney.',
      meal_type: 'breakfast',
      cuisine: 'South Indian',
      diet_type: 'Vegetarian',
      difficulty: 'Medium',
      prep_time_minutes: 15,
      cook_time_minutes: 15,
      total_time_minutes: 30,
      default_servings: 4,
      image_url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=900&auto=format&fit=crop&q=80',
      tips: 'Ensure the cast iron tawa is seasoned and lightly sprinkled with water before pouring the batter for that signature lace crispiness.',
      ingredients: [
        { name: 'Dosa Batter', qty: 3, unit: 'cups', prep: 'fermented overnight' },
        { name: 'Potatoes', qty: 4, unit: 'medium', prep: 'boiled and mashed' },
        { name: 'Onions', qty: 2, unit: 'pieces', prep: 'thinly sliced' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp', prep: 'whole' },
        { name: 'Curry Leaves', qty: 12, unit: 'leaves', prep: 'fresh' },
        { name: 'Turmeric Powder', qty: 0.5, unit: 'tsp', prep: 'ground' },
        { name: 'Ghee or Oil', qty: 3, unit: 'tbsp', prep: 'for roasting' }
      ],
      prep_tasks: [
        { name: 'Boil & Peel Potatoes', desc: 'Pressure cook or boil potatoes until tender, peel and roughly mash.', duration: 20, seq: 1 },
        { name: 'Slice Onions & Aromatics', desc: 'Finely slice 2 onions, mince ginger and chop green chillies.', duration: 10, seq: 2 },
        { name: 'Bring Batter to Room Temp', desc: 'Take out fermented batter 30 minutes before making dosas.', duration: 5, seq: 3 }
      ],
      steps: [
        { num: 1, title: 'Temper Aromatics & Onions', instruction: 'Heat 1 tbsp oil in a pan. Splutter mustard seeds, add curry leaves, green chilies, and sliced onions. Sauté until translucent.', duration: 180, temp: 'Medium', visual: 'Onions softened and lightly translucent, aromatic mustard seeds crackled.', tip: 'Do not brown the onions too much.' },
        { num: 2, title: 'Cook Spiced Potato Filling', instruction: 'Add turmeric powder, salt, and mashed potatoes. Add 3 tbsp water, blend gently and simmer for 3 minutes.', duration: 200, temp: 'Low-Medium', visual: 'Vibrant yellow, moist potato masala that holds shape without being runny.', tip: 'Gently mash any remaining large chunks with a spatula.' },
        { num: 3, title: 'Spread Dosa on Hot Pan', instruction: 'Heat flat pan/tawa. Pour a ladle of batter in center, spread in continuous spirals outward into a thin crepe.', duration: 60, temp: 'Medium-High', visual: 'Thin, even circular batter with small airy pores appearing.', tip: 'Rub cut onion with oil over pan for stick-free release.' },
        { num: 4, title: 'Roast with Ghee & Fold', instruction: 'Drizzle 1 tsp ghee around edges. Place 3 spoonfuls of potato filling in center. Once underside is deep golden brown, fold and serve.', duration: 120, temp: 'Medium', visual: 'Golden brown, crackly crisp underside that releases cleanly from pan.', tip: 'Serve immediately with coconut chutney and hot sambar.' }
      ]
    },
    {
      id: 'rec-dal-tadka-rice',
      name: 'Homestyle Dal Tadka with Steamed Basmati Rice',
      description: 'Creamy yellow lentils simmered with turmeric and garlic, finished with a sizzling double ghee tadka of cumin, garlic, and dried red chilies.',
      meal_type: 'lunch',
      cuisine: 'North Indian',
      diet_type: 'Vegetarian',
      difficulty: 'Easy',
      prep_time_minutes: 15,
      cook_time_minutes: 25,
      total_time_minutes: 40,
      default_servings: 4,
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=900&auto=format&fit=crop&q=80',
      tips: 'A pinch of hing (asafoetida) in the hot ghee releases authentic dhaba flavor.',
      ingredients: [
        { name: 'Toor Dal (Yellow Pigeon Peas)', qty: 1, unit: 'cup', prep: 'rinsed and soaked' },
        { name: 'Basmati Rice', qty: 1.5, unit: 'cups', prep: 'rinsed' },
        { name: 'Desi Ghee', qty: 3, unit: 'tbsp', prep: 'pure cow ghee' },
        { name: 'Garlic', qty: 6, unit: 'cloves', prep: 'finely minced' },
        { name: 'Onion', qty: 1, unit: 'medium', prep: 'finely chopped' },
        { name: 'Tomatoes', qty: 2, unit: 'medium', prep: 'finely chopped' },
        { name: 'Cumin Seeds', qty: 1.5, unit: 'tsp', prep: 'whole' },
        { name: 'Kashmiri Red Chilli', qty: 2, unit: 'pieces', prep: 'whole dried' }
      ],
      prep_tasks: [
        { name: 'Soak Dal', desc: 'Rinse toor dal 3 times in cold water and soak for 30 minutes to reduce cooking time and boost digestion.', duration: 30, seq: 1 },
        { name: 'Wash & Soak Basmati Rice', desc: 'Wash rice until water runs clear; soak for 20 minutes.', duration: 20, seq: 2 },
        { name: 'Chop Aromatics & Tomatoes', desc: 'Finely mince garlic and ginger; chop onions, tomatoes, and fresh coriander.', duration: 15, seq: 3 }
      ],
      steps: [
        { num: 1, title: 'Pressure Cook Dal', instruction: 'Add soaked dal, 3 cups water, 1/2 tsp turmeric, and 1 tsp salt to cooker/pot. Cook until completely soft and velvety.', duration: 600, temp: 'Medium-High', visual: 'Dal grains should melt when pressed between fingers; golden yellow color.', tip: 'Whisk briefly with a wooden masher for silky texture.' },
        { num: 2, title: 'Cook Steamed Basmati Rice', instruction: 'Bring 3 cups water to boil with 1 tsp ghee and salt. Add drained rice, cover tightly, and simmer on low for 11 minutes.', duration: 660, temp: 'Low', visual: 'Individual elongated fluffy grains with no standing water left in pot.', tip: 'Let rest covered off-heat for 5 minutes before fluffing with fork.' },
        { num: 3, title: 'Prepare Masala Base', instruction: 'Heat 1.5 tbsp ghee in a heavy pan. Sauté chopped onion and minced ginger until lightly golden. Stir in tomatoes until soft and oil separates.', duration: 300, temp: 'Medium', visual: 'Jammy onion-tomato masala with small droplets of ghee visible.', tip: 'A pinch of salt helps the tomatoes break down faster.' },
        { num: 4, title: 'Combine Dal with Masala', instruction: 'Pour cooked dal into the onion-tomato base. Add 1/2 cup warm water to adjust consistency. Simmer for 4 minutes.', duration: 240, temp: 'Medium-Low', visual: 'Gentle bubbling, rich golden yellow stew coated in savory aromatics.', tip: 'Dal thickens as it cools, so keep it slightly loose.' },
        { num: 5, title: 'Sizzle the Ghee Tadka', instruction: 'Heat 1.5 tbsp ghee in a small tadka pan. Add cumin seeds, dried red chillies, and minced garlic. Cook until garlic is golden, then pour over hot dal.', duration: 90, temp: 'Medium-High', visual: 'Frothy sizzling ghee with fragrant nutty toasted garlic and roasted cumin.', tip: 'Immediately cover pot with lid for 2 minutes to trap the smoky aroma!' }
      ]
    },
    {
      id: 'rec-veg-grilled-sandwich',
      name: 'Bombay Masala Vegetable Grilled Sandwich',
      description: 'Crispy toasted artisan bread layered with spicy mint-coriander chutney, spiced butter, boiled potatoes, beetroots, crunchy cucumbers, and melted cheese.',
      meal_type: 'high_tea',
      cuisine: 'Indian Street Food',
      diet_type: 'Vegetarian',
      difficulty: 'Easy',
      prep_time_minutes: 10,
      cook_time_minutes: 5,
      total_time_minutes: 15,
      default_servings: 2,
      image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=900&auto=format&fit=crop&q=80',
      tips: 'Spread butter on both sides of bread before spreading green chutney to keep the bread remarkably crispy.',
      ingredients: [
        { name: 'Bread Slices', qty: 4, unit: 'slices', prep: 'sourdough or sandwich bread' },
        { name: 'Green Mint Chutney', qty: 3, unit: 'tbsp', prep: 'freshly ground' },
        { name: 'Boiled Potato', qty: 1, unit: 'piece', prep: 'thinly sliced' },
        { name: 'Cucumber', qty: 0.5, unit: 'piece', prep: 'thin rounds' },
        { name: 'Tomato', qty: 1, unit: 'piece', prep: 'thin rounds' },
        { name: 'Chaat Masala', qty: 1, unit: 'tsp', prep: 'sprinkled' },
        { name: 'Butter', qty: 2, unit: 'tbsp', prep: 'softened' }
      ],
      prep_tasks: [
        { name: 'Slice Vegetables', desc: 'Slice boiled potato, beetroot, cucumber, and tomato into thin uniform rounds.', duration: 8, seq: 1 },
        { name: 'Blend Green Chutney', desc: 'Whiz fresh mint, coriander, green chili, garlic, lemon juice, and salt into a thick vibrant green spread.', duration: 5, seq: 2 }
      ],
      steps: [
        { num: 1, title: 'Butter & Spread Chutney', instruction: 'Generously butter each bread slice, then spread an even layer of spicy green mint chutney.', duration: 60, temp: 'Room Temp', visual: 'Vibrant green surface with glistening softened butter barrier.', tip: 'Butter prevents soggy bread.' },
        { num: 2, title: 'Layer Veggies & Chaat Masala', instruction: 'Layer cucumber slices, boiled potato rounds, tomato, and onion. Dust generously with chaat masala and black salt.', duration: 120, temp: 'Room Temp', visual: 'Neat, colorful vegetable mosaic with aromatic chaat masala coating.', tip: 'Lightly press down so the sandwich holds together cleanly.' },
        { num: 3, title: 'Grill to Golden Perfection', instruction: 'Spread butter on outer crust. Place in grill or hot skillet; press down gently with a spatula and toast until crunchy and deep golden brown.', duration: 240, temp: 'Medium', visual: 'Crackle of crisp toasted crust with toasted grill marks.', tip: 'Slice diagonally and serve piping hot with ketchup and extra chutney.' }
      ]
    },
    {
      id: 'rec-paneer-butter-masala',
      name: 'Restaurant Style Paneer Butter Masala',
      description: 'Velvety cottage cheese cubes bathed in a rich, buttery tomato-cashew reduction infused with kasuri methi and fragrant whole spices.',
      meal_type: 'dinner',
      cuisine: 'North Indian',
      diet_type: 'Vegetarian',
      difficulty: 'Medium',
      prep_time_minutes: 15,
      cook_time_minutes: 20,
      total_time_minutes: 35,
      default_servings: 4,
      image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=900&auto=format&fit=crop&q=80',
      tips: 'Soak paneer cubes in warm salted water for 10 minutes before adding to the gravy to keep them pillow-soft.',
      ingredients: [
        { name: 'Fresh Malai Paneer', qty: 300, unit: 'g', prep: 'cubed into bite-size pieces' },
        { name: 'Tomatoes', qty: 5, unit: 'ripe medium', prep: 'rough chopped' },
        { name: 'Cashew Nuts', qty: 15, unit: 'pieces', prep: 'soaked in warm water' },
        { name: 'Butter', qty: 3, unit: 'tbsp', prep: 'unsalted' },
        { name: 'Heavy Cream', qty: 3, unit: 'tbsp', prep: 'fresh' },
        { name: 'Ginger-Garlic Paste', qty: 1.5, unit: 'tbsp', prep: 'freshly pounded' },
        { name: 'Kasuri Methi', qty: 1, unit: 'tbsp', prep: 'dry roasted and crushed' },
        { name: 'Kashmiri Chili Powder', qty: 1, unit: 'tbsp', prep: 'for bright red hue' }
      ],
      prep_tasks: [
        { name: 'Soak Cashews & Cube Paneer', desc: 'Soak 15 cashews in 1/2 cup hot water for 15 minutes. Cut paneer into 1-inch squares and place in warm water.', duration: 15, seq: 1 },
        { name: 'Puree Tomato-Cashew Sauce', desc: 'Boil tomatoes with cashews and whole spices for 7 minutes, cool and blend into a silky smooth puree.', duration: 12, seq: 2 },
        { name: 'Measure Spices & Kasuri Methi', desc: 'Measure chili powder, garam masala, and crush kasuri methi between palms.', duration: 5, seq: 3 }
      ],
      steps: [
        { num: 1, title: 'Sauté Aromatics in Butter', instruction: 'Melt 2 tbsp butter in a wok or skillet. Add whole cardamom and ginger-garlic paste. Sauté until raw aroma vanishes.', duration: 90, temp: 'Medium', visual: 'Frothing butter releasing nutty garlic-ginger fragrance without scorching.', tip: 'Add 1 tsp oil to prevent butter from burning.' },
        { num: 2, title: 'Simmer Silky Tomato Cashew Gravy', instruction: 'Pour in strained tomato-cashew puree. Add Kashmiri red chili powder, coriander powder, and salt. Cover and simmer.', duration: 420, temp: 'Medium-Low', visual: 'Gravy deepens to a rich ruby orange and tiny oil bubbles emerge on the surface.', tip: 'Use a splatter screen as cashew gravy bubbles vigorously.' },
        { num: 3, title: 'Fold in Paneer & Fresh Cream', instruction: 'Gently slip in the drained soft paneer cubes. Stir in 3 tbsp fresh cream and 1/2 tsp sugar to balance tomato acidity.', duration: 180, temp: 'Low', visual: 'Cream blends into a luxurious satin gloss coating every paneer cube.', tip: 'Do not overcook paneer or it will become rubbery.' },
        { num: 4, title: 'Finish with Kasuri Methi & Butter', instruction: 'Crush roasted kasuri methi between your palms and scatter over curry. Drop in remaining 1 tbsp butter and turn off heat.', duration: 60, temp: 'Off Heat', visual: 'Aromatic crushed methi floating atop glossy red gravy with melting knob of butter.', tip: 'Serve alongside warm garlic butter naan or jeera rice.' }
      ]
    }
  ];

  for (const r of recipes) {
    console.log(`Upserting recipe ${r.id}...`);
    await client.query(`
      INSERT INTO public.recipes (
        id, name, title, description, meal_type, category, cuisine, diet_type, difficulty,
        prep_time_minutes, prep_time, cook_time_minutes, cook_time, total_time_minutes,
        default_servings, servings, image_url, tips
      ) VALUES (
        $1, $2, $2, $3, $4, $4, $5, $6, $7, $8, $8, $9, $9, $10, $11, $11, $12, $13
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        meal_type = EXCLUDED.meal_type,
        category = EXCLUDED.category,
        cuisine = EXCLUDED.cuisine,
        prep_time_minutes = EXCLUDED.prep_time_minutes,
        cook_time_minutes = EXCLUDED.cook_time_minutes,
        total_time_minutes = EXCLUDED.total_time_minutes,
        image_url = EXCLUDED.image_url,
        tips = EXCLUDED.tips;
    `, [
      r.id, r.name, r.description, r.meal_type, r.cuisine, r.diet_type, r.difficulty,
      r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.default_servings,
      r.image_url, r.tips
    ]);

    await client.query('DELETE FROM public.recipe_ingredients WHERE recipe_id = $1;', [r.id]);
    for (const ing of r.ingredients) {
      await client.query(`
        INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, preparation)
        VALUES ($1, $2, $3, $4, $5);
      `, [r.id, ing.name, ing.qty, ing.unit, ing.prep]);
    }

    await client.query('DELETE FROM public.recipe_preparation_tasks WHERE recipe_id = $1;', [r.id]);
    for (const task of r.prep_tasks) {
      await client.query(`
        INSERT INTO public.recipe_preparation_tasks (recipe_id, task_name, description, duration_minutes, sequence)
        VALUES ($1, $2, $3, $4, $5);
      `, [r.id, task.name, task.desc, task.duration, task.seq]);
    }

    await client.query('DELETE FROM public.recipe_steps WHERE recipe_id = $1;', [r.id]);
    for (const st of r.steps) {
      await client.query(`
        INSERT INTO public.recipe_steps (recipe_id, step_number, title, instruction, duration_seconds, temperature, visual_check, tip)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [r.id, st.num, st.title, st.instruction, st.duration, st.temp, st.visual, st.tip]);
    }
  }

  // Update other existing recipes to ensure valid meal_type, steps and prep tasks
  const res = await client.query('SELECT id, title, category FROM public.recipes;');
  for (const row of res.rows) {
    const rawCat = (row.category || 'dinner').toLowerCase();
    const validMeal = rawCat.includes('break') ? 'breakfast' : (rawCat.includes('lunch') ? 'lunch' : (rawCat.includes('tea') ? 'high_tea' : 'dinner'));
    await client.query('UPDATE public.recipes SET meal_type = $1, name = COALESCE(name, title) WHERE id = $2;', [validMeal, row.id]);

    const taskCount = await client.query('SELECT count(*)::int as c FROM public.recipe_preparation_tasks WHERE recipe_id = $1;', [row.id]);
    if (taskCount.rows[0].c === 0) {
      await client.query(`
        INSERT INTO public.recipe_preparation_tasks (recipe_id, task_name, description, duration_minutes, sequence)
        VALUES
        ($1, 'Mise en place', 'Chop aromatics, wash vegetables, and measure all seasonings.', 10, 1),
        ($1, 'Preheat Cookware', 'Ensure cookware is seasoned and cooking surfaces are at proper temperature.', 5, 2);
      `, [row.id]);
    }

    const stepCount = await client.query('SELECT count(*)::int as c FROM public.recipe_steps WHERE recipe_id = $1;', [row.id]);
    if (stepCount.rows[0].c === 0) {
      await client.query(`
        INSERT INTO public.recipe_steps (recipe_id, step_number, title, instruction, duration_seconds, temperature, visual_check, tip)
        VALUES
        ($1, 1, 'Heat Pan & Sauté Base', 'Heat pan over medium heat with oil or butter and sauté base aromatics until fragrant.', 180, 'Medium', 'Aromatics translucent and fragrant.', 'Do not allow garlic to burn.'),
        ($1, 2, 'Cook Main Ingredients', 'Add main vegetables, protein, or sauce and simmer gently until cooked through.', 480, 'Medium-Low', 'Gentle simmer and rich aroma.', 'Stir occasionally to avoid sticking.'),
        ($1, 3, 'Season & Garnish', 'Adjust seasoning with sea salt, cracked pepper, and fresh herbs before serving.', 120, 'Low', 'Balanced flavor and vibrant color.', 'Serve hot immediately.');
      `, [row.id]);
    }
  }

  console.log('Seeding completed successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
