import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestMoaka } from '@/lib/moaka/suggest'
export async function POST(req:NextRequest) {
 try {
 const supabase = await createClient()
 const { data, error } = await supabase.auth.getUser()
 if (error || !data.user) return NextResponse.json({error:'Please sign in to continue.'},{status:401})
 const body=await req.json();if(typeof body.query!=='string'||!body.query.trim()||body.query.length>500)return NextResponse.json({error:'Enter a dish or preference, up to 500 characters.'},{status:400});return NextResponse.json(await suggestMoaka(body.query.trim()))}
 catch{return NextResponse.json({error:'Unable to read recipe request.'},{status:400})}
}
