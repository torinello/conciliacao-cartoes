# Conciliação de Cartões

App web para importação automática de faturas de cartão de crédito com IA.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (banco de dados PostgreSQL)
- **Anthropic Claude** (leitura de PDFs)
- **Vercel** (hospedagem gratuita)

---

## Passo a passo para subir o site

### 1. Criar banco de dados no Supabase (gratuito)

1. Acesse https://supabase.com e crie uma conta
2. Clique em **New Project** e dê um nome (ex: `conciliacao-cartoes`)
3. Anote a senha do banco (você vai precisar)
4. Aguarde o projeto inicializar (~1 min)
5. Vá em **SQL Editor → New Query**
6. Cole o conteúdo do arquivo `supabase/migrations/001_initial.sql`
7. Clique em **Run** — isso cria as tabelas e regras iniciais
8. Vá em **Settings → API** e copie:
   - `Project URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public key` → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Obter chave da API Anthropic

1. Acesse https://console.anthropic.com
2. Vá em **API Keys → Create Key**
3. Copie a chave → será o `ANTHROPIC_API_KEY`

### 3. Fazer deploy no Vercel (gratuito)

**Opção A — via GitHub (recomendado):**
1. Suba este projeto para um repositório no GitHub
2. Acesse https://vercel.com e faça login com GitHub
3. Clique em **Add New → Project**
4. Selecione o repositório
5. Em **Environment Variables**, adicione as 3 variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ANTHROPIC_API_KEY             = sk-ant-...
   ```
6. Clique em **Deploy** — em ~2 min o site está no ar

**Opção B — via Vercel CLI:**
```bash
npm install -g vercel
cd conciliacao-app
vercel
# Siga as instruções e adicione as variáveis quando solicitado
```

### 4. Rodar localmente (opcional)

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas chaves

# Rodar em desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

---

## Como usar

1. **Importar fatura:** Clique em **+ Importar fatura** e selecione o PDF
2. O app envia o PDF para o Claude que extrai todos os lançamentos automaticamente
3. Os dados são salvos no Supabase (ficam lá para sempre)
4. **Editar:** Clique em "Editar" em qualquer lançamento para corrigir tipo, categoria, etc.
5. **Reembolso:** Clique no badge "⏳ Pendente" para marcar como reembolsado
6. **Exportar:** Clique em "↓ Exportar Excel" para baixar o arquivo .xlsx
7. **Regras:** Cadastre palavras-chave para que futuros PDFs sejam classificados automaticamente

---

## Estrutura do projeto

```
conciliacao-app/
├── app/
│   ├── api/
│   │   ├── extrair/route.ts      # Lê PDF com Claude AI
│   │   └── lancamentos/route.ts  # CRUD no Supabase
│   ├── dashboard/page.tsx         # Interface principal
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── supabase.ts               # Cliente Supabase + tipos
│   └── export.ts                 # Exportação Excel
├── supabase/
│   └── migrations/001_initial.sql # Schema do banco
├── .env.local.example
└── README.md
```

---

## Custos estimados

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel  | Hobby (gratuito) | R$ 0 |
| Supabase | Free (500MB) | R$ 0 |
| Anthropic API | ~R$ 0,10 por fatura lida | Pagamento por uso |

Para uso pessoal (2-4 faturas/mês), o custo mensal fica abaixo de R$ 1,00.
