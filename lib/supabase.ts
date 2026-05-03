import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Lancamento = {
  id?: string
  created_at?: string
  data: string
  cartao: string
  titular: string
  estabelecimento: string
  descricao: string
  valor: number
  tipo: string
  cobranca_terceiros: string
  nome_terceiro: string
  descontar_de: string
  data_reembolso: string
  status_reembolso: string
  obs: string
  mes_referencia: string
  fatura_origem: string
}

export type Regra = {
  id?: string
  palavra_chave: string
  descricao: string
  tipo: string
  descontar_de: string
  cobranca_terceiros: string
}
