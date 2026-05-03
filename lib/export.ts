import * as XLSX from 'xlsx'
import type { Lancamento } from './supabase'

export function exportarExcel(lancamentos: Lancamento[], nomeArquivo?: string) {
  const wb = XLSX.utils.book_new()

  const header = [
    'DATA','CARTÃO','TITULAR','ESTABELECIMENTO','DESCRIÇÃO/CATEGORIA',
    'VALOR (R$)','TIPO','COBRANÇA TERCEIROS?','NOME TERCEIRO','DESCONTAR DE',
    'DATA REEMBOLSO','STATUS REEMBOLSO','OBSERVAÇÕES','MÊS REF.','FATURA ORIGEM'
  ]

  const rows = lancamentos.map(l => [
    l.data, l.cartao, l.titular, l.estabelecimento, l.descricao,
    l.valor, l.tipo, l.cobranca_terceiros, l.nome_terceiro,
    l.descontar_de, l.data_reembolso, l.status_reembolso,
    l.obs, l.mes_referencia, l.fatura_origem
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = [
    {wch:12},{wch:18},{wch:22},{wch:28},{wch:26},{wch:12},{wch:10},
    {wch:16},{wch:22},{wch:16},{wch:14},{wch:18},{wch:30},{wch:12},{wch:20}
  ]

  // Estilo do cabeçalho
  const range = XLSX.utils.decode_range(ws['!ref']!)
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[addr]) continue
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F3864' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Todos os lançamentos')

  // Aba por titular
  const titulares = [...new Set(lancamentos.map(l => l.titular).filter(Boolean))]
  titulares.forEach(t => {
    const filtrado = lancamentos.filter(l => l.titular === t)
    const wsT = XLSX.utils.aoa_to_sheet([header, ...filtrado.map(l => [
      l.data, l.cartao, l.titular, l.estabelecimento, l.descricao,
      l.valor, l.tipo, l.cobranca_terceiros, l.nome_terceiro,
      l.descontar_de, l.data_reembolso, l.status_reembolso,
      l.obs, l.mes_referencia, l.fatura_origem
    ])])
    XLSX.utils.book_append_sheet(wb, wsT, t.substring(0, 28))
  })

  // Aba resumo
  const total       = lancamentos.reduce((s, l) => s + (l.valor || 0), 0)
  const pendente    = lancamentos.filter(l => l.status_reembolso === '⏳ PENDENTE').reduce((s,l) => s+(l.valor||0),0)
  const reembolsado = lancamentos.filter(l => l.status_reembolso === '✔ REEMBOLSADO').reduce((s,l) => s+(l.valor||0),0)
  const empresa     = lancamentos.filter(l => l.tipo === 'Empresa').reduce((s,l) => s+(l.valor||0),0)

  const wsR = XLSX.utils.aoa_to_sheet([
    ['RESUMO — CONCILIAÇÃO DE CARTÕES'],
    [],
    ['INDICADOR', 'VALOR (R$)'],
    ['Total de lançamentos', lancamentos.length],
    ['Total geral', total],
    ['Total empresa', empresa],
    ['Total pessoal', total - empresa],
    ['Pendente de reembolso', pendente],
    ['Já reembolsado', reembolsado],
  ])
  wsR['!cols'] = [{wch:35},{wch:20}]
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumo')

  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')
  XLSX.writeFile(wb, nomeArquivo || `Conciliacao_${data}.xlsx`)
}
