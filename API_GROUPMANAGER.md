# GroupManager API - Documentação

## 📋 Visão Geral

A API `GroupManager` fornece endpoints para gerenciar grupos, vendedores e rastrear vendas com suporte a múltiplos períodos.

---

## 🔧 Setup Inicial

### 1. Executar Migração SQL

Antes de usar a API, execute a seguinte migração SQL para criar as tabelas necessárias:

```sql
-- Migration: Add payment status to grupos table and create vendor_status table
-- Arquivo: scripts/002-add-payment-status.sql

-- 1. Adicionar coluna payment_status na tabela grupos
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS payment_status BOOLEAN DEFAULT FALSE;

-- 2. Criar tabela vendor_status para rastrear o status de recebimento dos vendedores
CREATE TABLE IF NOT EXISTS vendor_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  recebimento_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, grupo_id)
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vendor_status_grupo_id ON vendor_status(grupo_id);
CREATE INDEX IF NOT EXISTS idx_vendor_status_user_id ON vendor_status(user_id);
```

**Ou use o Supabase CLI:**
```bash
supabase migration up --file scripts/002-add-payment-status.sql
```

---

## 🚀 Endpoints da API

### GET `/api/admin/grupos`

Retorna todos os grupos com informações completas de vendedores, produtos e transações.

**Autenticação:** Requer role `admin`

**Response (200 OK):**
```json
{
  "success": true,
  "grupos": [
    {
      "id": "uuid",
      "nome": "Grupo Alpha",
      "statusPagamento": true,
      "dataCriacao": "2025-01-15T00:00:00.000Z",
      "vendedores": [
        {
          "id": "uuid",
          "nome": "João Silva",
          "contato": "joao@email.com",
          "chavePix": "joao.silva@pix",
          "statusRecebimento": true,
          "produtos": [
            {
              "id": "uuid",
              "nome": "Água Mineral",
              "transacoes": [
                {
                  "id": "uuid",
                  "data": "2025-02-01T00:00:00.000Z",
                  "quantidade": 7,
                  "valorUnitario": 2.50
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

### GET `/api/admin/grupos/:id`

Retorna detalhes de um grupo específico.

**Autenticação:** Requer role `admin`

**Parameters:**
- `id` (path): UUID do grupo

**Response (200 OK):** Mesmo formato do grupo individual no endpoint anterior

---

### PUT `/api/admin/grupos/:id/pagamento`

Atualiza o status de pagamento de um grupo.

**Autenticação:** Requer role `admin`

**Request Body:**
```json
{
  "statusPagamento": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "grupo": {
    "id": "uuid",
    "nome": "Grupo Alpha",
    "payment_status": true,
    "updated_at": "2026-03-22T10:00:00.000Z"
  }
}
```

---

### PUT `/api/admin/grupos/:id/vendedor/:vendedor_id/recebimento`

Atualiza o status de recebimento de um vendedor em um grupo.

**Autenticação:** Requer role `admin`

**Parameters:**
- `id` (path): UUID do grupo
- `vendedor_id` (path): UUID do vendedor (user_id)

**Request Body:**
```json
{
  "statusRecebimento": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "vendedorStatus": {
    "id": "uuid",
    "user_id": "uuid",
    "grupo_id": "uuid",
    "recebimento_status": true,
    "created_at": "2026-03-22T10:00:00.000Z",
    "updated_at": "2026-03-22T10:00:00.000Z"
  }
}
```

---

### POST `/api/admin/grupos`

Cria um novo grupo.

**Autenticação:** Requer role `admin`

**Request Body:**
```json
{
  "nome": "Novo Grupo",
  "descricao": "Descrição opcional",
  "user_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "grupo": {
    "id": "uuid",
    "nome": "Novo Grupo",
    "descricao": "Descrição opcional",
    "user_id": "uuid",
    "created_at": "2026-03-22T10:00:00.000Z"
  }
}
```

---

### DELETE `/api/admin/grupos/:id`

Deleta um grupo (e todas as suas relações em cascata).

**Autenticação:** Requer role `admin`

**Parameters:**
- `id` (path): UUID do grupo

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Grupo deletado com sucesso"
}
```

---

## 📊 Schema da API

### Estrutura de Grupo
```typescript
interface Grupo {
  id: string          // UUID
  nome: string        // Nome do grupo
  statusPagamento: boolean  // Se o grupo já pagou
  vendedores: Vendedor[]    // Lista de vendedores
  dataCriacao: Date   // Data de criação
}
```

### Estrutura de Vendedor
```typescript
interface Vendedor {
  id: string          // UUID do user
  nome: string        // Nome do vendedor
  contato: string     // Telefone ou email
  chavePix: string    // Chave PIX para transferência
  statusRecebimento: boolean  // Se recebeu o repasse
  produtos: Produto[]  // Produtos vendidos
}
```

### Estrutura de Produto
```typescript
interface Produto {
  id: string          // UUID
  nome: string        // Nome do produto
  transacoes: Transacao[]  // Vendas do produto
}
```

### Estrutura de Transação
```typescript
interface Transacao {
  id: string          // UUID da venda
  data: Date          // Data da venda
  quantidade: number  // Quantidade vendida
  valorUnitario: number  // Valor unitário
}
```

---

## 🔒 Regras de Negócio

1. **Apenas Admins podem acessar** - Todos os endpoints requerem `role === "admin"`

2. **Pagamento Obrigatório** - Um vendedor só pode receber (status de recebimento = true) se o grupo tiver pago primeiro

3. **Cascata de Dados** - Ao deletar um grupo, todas as relações são deletadas automaticamente

4. **Chave PIX** - Extraída do campo `billing_setup` do usuário no banco

---

## 🔗 Integração com GroupManager

O componente `GroupManager` está totalmente integrado com esta API:

```tsx
import { GroupManager } from "@/components/dashboard/grupos/GroupManager"

// Na página
export default function GerenciarGruposPage() {
  return <GroupManager />
}
```

**Features:**
- ✅ Carregamento automático de dados da API
- ✅ Atualização em tempo real ao mudar status
- ✅ Toast notifications para feedback
- ✅ Loading states
- ✅ Fallback para mock data em caso de erro

---

## 🐛 Troubleshooting

### Erro: "Coluna payment_status não existe"

**Solução:** Execute a migração SQL:
```bash
psql -U postgres -d yakuza_raw_site -f scripts/002-add-payment-status.sql
```

### Erro: "Tabela vendor_status não existe"

**Solução:** Mesma do erro anterior - execute a migração completa.

### Nenhum grupo aparece

**Verifiquei:**
- [ ] Você é admin?
- [ ] Existem grupos criados no banco?
- [ ] A API retorna 401 (Unauthorized)?

---

## 📝 Exemplos de Uso

### Atualizar status de um grupo como Pago

```javascript
fetch("/api/admin/grupos/uuid-grupo", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ statusPagamento: true })
})
```

### Marcar vendedor como recebido

```javascript
fetch("/api/admin/grupos/uuid-grupo/vendedor/uuid-vendedor/recebimento", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ statusRecebimento: true })
})
```

---

## 📂 Arquivos Criados

```
app/
├── api/
│   └── admin/
│       └── grupos/
│           ├── route.ts                    # GET (listar), POST (criar)
│           ├── [id]/
│           │   ├── route.ts                # GET (detalhes), DELETE
│           │   ├── pagamento/
│           │   │   └── route.ts            # PUT (atualizar pagamento)
│           │   └── vendedor/
│           │       └── [vendedor_id]/
│           │           └── recebimento/
│           │               └── route.ts    # PUT (atualizar recebimento)
│           └── ...
└── dashboard/
    └── admin/
        ├── grupos/
        │   └── page.tsx                    # Página do GroupManager
        └── ...

components/
└── dashboard/
    └── grupos/
        └── GroupManager.tsx                # Componente (agora com API)

scripts/
└── 002-add-payment-status.sql             # Migração SQL
```

---

## ✅ Checklist de Deploy

- [ ] Executar migração SQL
- [ ] Verificar se `NEXT_PUBLIC_API_URL` está correto
- [ ] Confirmar que usuário admin logado
- [ ] Testar cada endpoint com ferramentas como Postman/Insomnia
- [ ] Verificar toast notifications aparecem
- [ ] Confirmar dados persistem após refresh

---

Desenvolvido para o projeto Yakuza Raws. 🎬
