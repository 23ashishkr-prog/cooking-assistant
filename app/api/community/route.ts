import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { recipeContainsExcludedMeat, recipeMatchesDietPreference } from '@/lib/recipe-personalization'

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const userId = new URL(req.url).searchParams.get('userId') || 'default_user'
    const [{ data: preferences }, { data: posts, error }] = await Promise.all([
      supabase.from('user_food_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('community_posts').select(`
        id, user_id, author_name, caption, media_url, media_type, likes_count, created_at,
        recipes (
          id, name, title, description, image_url, meal_type, category, cuisine, diet_type,
          prep_time_minutes, cook_time_minutes, total_time_minutes, calories, nutrition_score,
          ingredients, instructions
        )
      `).eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    ])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const personalized = (posts || []).filter((post: any) => {
      const recipe = Array.isArray(post.recipes) ? post.recipes[0] : post.recipes
      return recipe
        && recipeMatchesDietPreference(recipe, preferences?.diet_type)
        && !recipeContainsExcludedMeat(recipe, preferences?.excluded_meats || [])
    })
    return NextResponse.json({ posts: personalized })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const form = await req.formData()
    const name = String(form.get('name') || '').trim()
    const ingredients = String(form.get('ingredients') || '').split(',').map(value => value.trim()).filter(Boolean)
    const steps = String(form.get('steps') || '').split('\n').map(value => value.trim()).filter(Boolean)
    if (!name || ingredients.length === 0 || steps.length === 0) {
      return NextResponse.json({ error: 'Recipe name, ingredients, and steps are required.' }, { status: 400 })
    }

    const media = form.get('media')
    let mediaUrl = ''
    let mediaType = 'image'
    if (media instanceof File && media.size > 0) {
      if (media.size > 30 * 1024 * 1024) {
        return NextResponse.json({ error: 'Photo or short video must be under 30 MB.' }, { status: 400 })
      }
      mediaType = media.type.startsWith('video/') ? 'video' : 'image'
      const extension = media.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || (mediaType === 'video' ? 'mp4' : 'jpg')
      const objectPath = `${String(form.get('user_id') || 'default_user')}/${Date.now()}-${slug(name)}.${extension}`
      const { error: uploadError } = await supabase.storage.from('community-media').upload(objectPath, Buffer.from(await media.arrayBuffer()), {
        contentType: media.type || undefined,
        upsert: false,
      })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      mediaUrl = supabase.storage.from('community-media').getPublicUrl(objectPath).data.publicUrl
    }

    const recipeId = `community-${slug(name)}-${Date.now()}`
    const mealType = String(form.get('meal_type') || 'dinner').toLowerCase()
    const recipeRow = {
      id: recipeId,
      name,
      title: name,
      description: String(form.get('description') || form.get('caption') || ''),
      meal_type: mealType,
      category: mealType.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      cuisine: String(form.get('cuisine') || 'Community'),
      diet_type: String(form.get('diet_type') || 'Vegetarian'),
      difficulty: String(form.get('difficulty') || 'Easy'),
      prep_time_minutes: Number(form.get('prep_time_minutes')) || 15,
      cook_time_minutes: Number(form.get('cook_time_minutes')) || 20,
      default_servings: Number(form.get('servings')) || 4,
      image_url: mediaType === 'image' && mediaUrl ? mediaUrl : null,
      ingredients: ingredients.map((ingredient, index) => ({ name: ingredient, quantity: 1, unit: 'as needed', sequence: index + 1 })),
      instructions: steps,
      published: true,
      updated_at: new Date().toISOString(),
    }
    const { data: recipe, error: recipeError } = await supabase.from('recipes').insert(recipeRow).select().single()
    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })

    const ingredientRows = ingredients.map((ingredient, index) => ({
      recipe_id: recipeId,
      ingredient_name: ingredient,
      normalized_name: ingredient.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
      quantity: 1,
      unit: 'as needed',
      sequence: index + 1,
    }))
    const stepRows = steps.map((instruction, index) => ({
      recipe_id: recipeId,
      step_number: index + 1,
      title: `Step ${index + 1}`,
      instruction,
      duration_seconds: 180,
      temperature: 'Medium',
    }))
    const { error: ingredientError } = await supabase.from('recipe_ingredients').insert(ingredientRows)
    if (ingredientError) return NextResponse.json({ error: ingredientError.message }, { status: 500 })
    const { error: stepError } = await supabase.from('recipe_steps').insert(stepRows)
    if (stepError) return NextResponse.json({ error: stepError.message }, { status: 500 })

    const { data: post, error: postError } = await supabase.from('community_posts').insert({
      user_id: String(form.get('user_id') || 'default_user'),
      recipe_id: recipeId,
      author_name: String(form.get('author_name') || 'Moaka Cook'),
      caption: String(form.get('caption') || ''),
      media_url: mediaUrl || recipe.image_url,
      media_type: mediaType,
      status: 'published',
    }).select().single()
    if (postError) return NextResponse.json({ error: postError.message }, { status: 500 })
    return NextResponse.json({ success: true, post, recipe })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { postId } = await req.json()
  const { data: current } = await supabase.from('community_posts').select('likes_count').eq('id', postId).single()
  const { data, error } = await supabase.from('community_posts').update({ likes_count: Number(current?.likes_count || 0) + 1 }).eq('id', postId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, post: data })
}
