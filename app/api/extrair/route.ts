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
- Para faturas Nubank: cada linha de transação mostra o número do cartão no formato "•••• XXXX" — use exatamente esse número para o campo cartao, no formato "Nubank •••• XXXX"
- Se a fatura tiver múltiplos cartões por titular, cada lançamento deve ter o cartão correto daquela linha
- Para parcelas, inclua a info "Parcela X/Y" no campo obs
- IOF de compras internacionais: inclua como lançamento separado com estabelecimento "IOF Internacional" e obs com o nome da compra original

Para cada lançamento retorne JSON com:
- data: string DD/MM/AAAA
- cartao: string com banco e últimos 4 dígitos (ex: "Nubank •••• 0105", "Bradesco •••• 4933")
- titular: nome completo do titular do cartão
- estabelecimento: nome exato do estabelecimento
- descricao: categoria resumida (Alimentação, Transporte, Assinatura, Viagem, Compras, etc)
- valor: número float positivo
- tipo: "Pessoal" ou "Empresa"
- cobranca_terceiros: "Sim" ou "Não"
- nome_terceiro: nome se cobrança de terceiros, senão ""
- descontar_de: "Pessoal" por padrão
- obs: parcela X/Y, moeda original, ou outras observações relevantes
- mes_referencia: mês/ano de VENCIMENTO da fatura no formato "MM/AAAA" (ex: se vence em 11 MAI 2026, retorne "05/2026")
- fatura_origem: banco + número cartão (ex: "Nubank •••• 0105")

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
        max_tokens: 8000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt }
        ]}]
      })
    })
    const data = await response.json()
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })
    const text = data.content.map((b: any) => b.text || '').join('').replace(/```json|```/g,'').trim()
    const lancamentos = JSON.parse(text)
    return NextResponse.json({ lancamentos, total: lancamentos.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
