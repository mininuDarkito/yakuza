-- Create tables for the sales management system

-- Users table for Discord OAuth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grupos (Groups) table
CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  channel_id TEXT UNIQUE NOT NULL,
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos (Products) table
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
  grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas (Sales) table
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  buyer TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  numero INTEGER NOT NULL,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(produto_id, numero)
);

-- Activity Log table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_produtos_grupo_id ON produtos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_vendas_produto_id ON vendas(produto_id);
CREATE INDEX IF NOT EXISTS idx_vendas_grupo_id ON vendas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
