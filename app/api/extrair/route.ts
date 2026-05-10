import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const prompt = `Extraia todos os lançamentos de compra desta fatura de cartão de crédito brasileira.

REGRAS IMPORTANTES:
- Ignore completamente: pagamentos recebidos, IOF, estornos, saldo restante, créditos (valores negativos que sejam estornos/pagamentos)
- Para faturas Nubank: o campo "cartao" deve ser SEMPRE "Nubank - [Nome do titular]" (ex: "Nubank - Enrico Torinello"), independente do cartão virtual usado. O número do cartão virtual (•••• XXXX) deve ir no campo "obs" junto com outras informações (ex: "cartão •••• 0105 | Parcela 3/6")
- Para outros bancos (Bradesco, Itaú, etc): use "Banco •••• XXXX" normalmente
- Para parcelas, inclua "Parcela X/Y" no campo obs
- IOF de compras internacionais: inclua como lançamento separado com estabelecimento "IOF Internacional"

Para cada lançamento retorne JSON com:
- data: string DD/MM/AAAA
- cartao: "Nubank - [Nome Titular]" para Nubank, ou "Banco •••• XXXX" para outros
- titular: nome completo do titular do cartão
- estabelecimento: nome exato do estabelecimento
- descricao: categoria resumida (Alimentação, Transporte, Assinatura, Viagem, Compras, etc)
- valor: número float positivo
- tipo: "Pessoal" ou "Empresa"
- cobranca_terceiros: "Sim" ou "Não"
- nome_terceiro: nome se cobrança de terceiros, senão ""
- descontar_de: "Pessoal" por padrão
- obs: número do cartão virtual + parcela + moeda original (ex: "cartão •••• 0105 | Parcela 3/6")
- mes_referencia: mês/ano de VENCIMENTO da fatura no formato "MM/AAAA" (ex: se vence em 11 MAI 2026, retorne "05/2026")
- fatura_origem: mesmo valor que cartao

Retorne SOMENTE array JSON válido, sem texto antes ou depois, sem markdown.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt }
        ]}]
      })
    })
    const data = await response.json()
    if (data.error) return NextResponse.json({ error: `API error: ${data.error.message}` }, { status: 500 })
    const rawText = data.content.map((b: any) => b.text || '').join('')
    const text = rawText.replace(/```json|```/g, '').trim()
    let lancamentos: any[]
    try {
      lancamentos = JSON.parse(text)
    } catch (parseErr: any) {
      return NextResponse.json({
        error: `JSON inválido: ${parseErr.message}. Resposta: ${text.slice(0, 800)}`
      }, { status: 500 })
    }
    if (!Array.isArray(lancamentos)) {
      return NextResponse.json({
        error: `Resposta não é array. Conteúdo: ${text.slice(0, 300)}`
      }, { status: 500 })
    }
    return NextResponse.json({ lancamentos, total: lancamentos.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
