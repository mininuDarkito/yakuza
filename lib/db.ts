import { Pool } from 'pg';

// Cria um pool de conexões para não abrir uma nova toda hora
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exporta uma função simples para rodar queries
export const sql = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

export type User = {
  id: string
  discord_id: string
  discord_username: string
  discord_avatar: string | null
  email: string | null
  created_at: Date
  updated_at: Date
}

export type Grupo = {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  created_at: Date
  updated_at: Date
}

export type Produto = {
  id: string
  grupo_id: string
  nome: string
  descricao: string | null
  preco: number
  ativo: boolean
  created_at: Date
  updated_at: Date
}

export type Venda = {
  id: string
  user_id: string
  produto_id: string
  grupo_id: string
  quantidade: number
  preco_unitario: number
  preco_total: number
  cliente_nome: string | null
  cliente_contato: string | null
  observacoes: string | null
  data_venda: Date
  created_at: Date
}

export type ActivityLog = {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: Date
}
