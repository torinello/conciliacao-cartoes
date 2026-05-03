-- Execute este SQL no Supabase: SQL Editor > New Query

create table if not exists lancamentos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  data        text not null,
  cartao      text,
  titular     text,
  estabelecimento text not null,
  descricao   text,
  valor       numeric(12,2) not null,
  tipo        text default 'Pessoal',
  cobranca_terceiros text default 'Não',
  nome_terceiro text,
  descontar_de text default 'Pessoal',
  data_reembolso text,
  status_reembolso text default 'N/A',
  obs         text,
  mes_referencia text,
  fatura_origem text
);

create table if not exists regras (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  palavra_chave text not null unique,
  descricao   text,
  tipo        text default 'Pessoal',
  descontar_de text default 'Pessoal',
  cobranca_terceiros text default 'Não'
);

-- Regras iniciais
insert into regras (palavra_chave, descricao, tipo, descontar_de) values
  ('AMAZON',    'Compras online',        'Empresa', 'Empresa'),
  ('IFOOD',     'Alimentação delivery',  'Pessoal', 'Pessoal'),
  ('UBER',      'Transporte',            'Empresa', 'Empresa'),
  ('NETFLIX',   'Streaming',             'Pessoal', 'Pessoal'),
  ('APPLE',     'Assinatura Apple',      'Pessoal', 'Pessoal'),
  ('MERCADINHO SAO LUIZ', 'Supermercado','Pessoal', 'Pessoal'),
  ('LEROY',     'Material construção',   'Pessoal', 'Pessoal'),
  ('FARMACIA',  'Farmácia',              'Pessoal', 'Pessoal'),
  ('PAGUE MENOS','Farmácia',             'Pessoal', 'Pessoal'),
  ('TAP WEB',   'Passagem TAP',          'Pessoal', 'Pessoal'),
  ('GOL',       'Passagem GOL',          'Pessoal', 'Pessoal'),
  ('AIR FRANCE','Passagem Air France',   'Pessoal', 'Pessoal'),
  ('COBASI',    'Pet shop',              'Pessoal', 'Pessoal'),
  ('ACADEMIA',  'Academia',              'Pessoal', 'Pessoal'),
  ('SMILES',    'Milhas / Bilhete',      'Pessoal', 'Pessoal'),
  ('SEGURO',    'Seguro',                'Pessoal', 'Pessoal'),
  ('ANUIDADE',  'Anuidade cartão',       'Pessoal', 'Pessoal')
on conflict (palavra_chave) do nothing;

-- Row Level Security (opcional mas recomendado)
alter table lancamentos enable row level security;
alter table regras enable row level security;

-- Política aberta (ajuste se quiser autenticação por usuário)
create policy "acesso_total" on lancamentos for all using (true) with check (true);
create policy "acesso_total" on regras for all using (true) with check (true);
