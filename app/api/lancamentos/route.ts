import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mes   = searchParams.get('mes')
  const limit = parseInt(searchParams.get('limit') || '500')

  let query = supabase.from('lancamentos').select('*').order('data', { ascending: false }).limit(limit)
  if (mes) query = query.eq('mes_referencia', mes)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lancamentos: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const items = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase.from('lancamentos').insert(items).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lancamentos: data, inserted: data?.length })
}

export async function PATCH(req: NextRequest) {
  const { id, ...fields } = await req.json()
  const { data, error } = await supabase.from('lancamentos').update(fields).eq('id', id).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lancamento: data?.[0] })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
