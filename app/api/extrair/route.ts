import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const prompt = `Extraia todos os lançamentos desta fatura de cartão de crédito brasileira. Para cada lançamento retorne JSON com: data (DD/MM/AAAA), cartao (ex: "Bradesco *4933"), titular (nome completo), estabelecimento (nome exato), descricao (categoria resumida), valor (número float), tipo ("Pessoal" ou "Empresa"), cobranca_terceiros ("Sim" ou "Não"), nome_terceiro (se adicional, senão ""), descontar_de ("Pessoal" por padrão), obs (parcela X/Y, IOF, etc), mes_referencia (mês/ano de VENCIMENTO da fatura no formato "MM/AAAA" — exemplo: se vence em 05/2026 retorne "05/2026"), fatura_origem (banco + número cartão). Ignore pagamentos e créditos. Retorne SOMENTE array JSON válido.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
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
