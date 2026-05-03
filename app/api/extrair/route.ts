import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const prompt = `Extraia todos os lançamentos desta fatura de cartão de crédito brasileira. Para cada lançamento retorne JSON com: data (DD/MM/AAAA), cartao, titular, estabelecimento, descricao, valor (float), tipo (Pessoal/Empresa), cobranca_terceiros (Sim/Não), nome_terceiro, descontar_de, obs, mes_referencia (MM/AAAA), fatura_origem. Ignore pagamentos e créditos. Retorne SOMENTE array JSON válido.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt }
        ]}]
      })
    })

    const data = await response.json()
    const text = data.content.map((b: any) => b.text || '').join('').replace(/```json|```/g,'').trim()
    const lancamentos = JSON.parse(text)
    return NextResponse.json({ lancamentos, total: lancamentos.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
