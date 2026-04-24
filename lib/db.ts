import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

// 1. Prisma Client para as novas queries
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 2. Pool legado para não quebrar o que já existe (Será removido gradualmente)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const sql = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

// Tipos exportados (Podem ser substituídos pelos tipos do Prisma conforme refatoramos)
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
  nome: string
  descricao: string | null
  imagem_url: string | null
  plataforma: string | null
  created_at: Date
  updated_at: Date
}

export type Venda = {
  id: string
  user_id: string
  produto_id: string
  grupo_id: string | null
  capitulo: number // Alterado de quantidade -> capitulo
  preco_unitario: number
  preco_total: number
  observacoes: string | null
  data_venda: Date
  created_at: Date
}
