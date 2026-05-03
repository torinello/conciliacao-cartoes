import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const prompt = `Você é um extrator de dados de faturas de cartão de crédito brasileiras.

Analise este PDF e extraia TODOS os lançamentos de compras/débitos.

Para cada lançamento retorne um objeto JSON com:
- data: "DD/MM/AAAA" (deduza o ano pelo contexto da fatura)
- cartao: nome e últimos 4 dígitos (ex: "Bradesco *4933")
- titular: nome do titular daquele lançamento
- estabelecimento: nome exato como aparece na fatura
- descricao: categoria resumida (ex: "Supermercado", "Passagem aérea", "Farmácia", "Assinatura digital")
- valor: número float
- tipo: "Pessoal" ou "Empresa"
- cobranca_terceiros: "Sim" se o titular for cartão adicional com nome diferente do principal, "Não" caso contrário
- nome_terceiro: nome do adicional se cobranca_terceiros="Sim", senão ""
- descontar_de: "Pessoal" por padrão, ou nome do terceiro se for adicional
- obs: notas importantes (parcela X/Y, moeda estrangeira, IOF, etc.)
- mes_referencia: mês/ano da fatura no formato "MM/AAAA"
- fatura_origem: nome do arquivo ou banco + número do cartão

Ignore: pagamentos recebidos, créditos, saldo anterior.
Inclua: IOF, anuidade, seguros, todas as compras e débitos.

Retorne SOMENTE um array JSON válido, sem texto antes ou depois, sem markdown.`

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
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content.map((b: any) => b.text || '').join('').replace(/```json|```/g,'').trim()
    const lancamentos = JSON.parse(text)

    return NextResponse.json({ lancamentos, total: lancamentos.length })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
