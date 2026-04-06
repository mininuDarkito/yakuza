-- Habilita a extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id text UNIQUE NOT NULL,
    discord_username text NOT NULL,
    discord_avatar text,
    email text,
    role text DEFAULT 'user',
    billing_setup jsonb DEFAULT '{"chave_pix": "", "instrucoes": "", "tipo_chave": "pix", "metodo_preferido": "pix", "nome_beneficiario": ""}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discord_banner text
);

-- 2. PRODUTOS
CREATE TABLE produtos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome text UNIQUE NOT NULL,
    descricao text,
    imagem_url text,
    link_serie text,
    plataforma varchar(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nome_alternativo text
);

-- 3. GRUPOS
CREATE TABLE grupos (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome text NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    channel_id text UNIQUE,
    payment_status boolean DEFAULT false
);

-- 4. ACTIVITY LOGS
CREATE TABLE activity_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. VENDAS
CREATE TABLE vendas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    grupo_id uuid REFERENCES grupos(id) ON DELETE SET NULL,
    quantidade numeric(10,2) NOT NULL,
    preco_unitario numeric(10,2) NOT NULL,
    preco_total numeric(10,2) NOT NULL,
    observacoes text,
    data_venda timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp(6) with time zone DEFAULT now(),
    capitulos_detalhes text,
    lock_user boolean DEFAULT false,
    lock_admin boolean DEFAULT false,
    UNIQUE (user_id, produto_id, grupo_id, quantidade)
);

-- 6. USER SERIES
CREATE TABLE user_series (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    preco numeric(10,2) DEFAULT 0.00 NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, produto_id, grupo_id)
);

-- 7. GRUPO MONTHLY PAYMENT
CREATE TABLE grupo_monthly_payment (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    month_year varchar(7) NOT NULL,
    payment_status boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (grupo_id, month_year)
);

-- 8. VENDOR STATUS
CREATE TABLE vendor_status (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    recebimento_status boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, grupo_id)
);

-- 9. VENDOR MONTHLY STATUS
CREATE TABLE vendor_monthly_status (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    month_year varchar(7) NOT NULL,
    recebimento_status boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, grupo_id, month_year)
);

-- ==========================================
-- ÍNDICES (INDEXES) DE OTIMIZAÇÃO
-- ==========================================

-- Índices para grupo_monthly_payment
CREATE INDEX idx_grupo_monthly_payment_grupo_id ON grupo_monthly_payment (grupo_id);
CREATE INDEX idx_grupo_monthly_payment_month ON grupo_monthly_payment (month_year);
CREATE INDEX idx_grupo_monthly_payment_status ON grupo_monthly_payment (payment_status);

-- Índices para vendor_monthly_status
CREATE INDEX idx_vendor_monthly_status_user_id ON vendor_monthly_status (user_id);
CREATE INDEX idx_vendor_monthly_status_grupo_id ON vendor_monthly_status (grupo_id);
CREATE INDEX idx_vendor_monthly_status_month ON vendor_monthly_status (month_year);

-- Índices para vendor_status
CREATE INDEX idx_vendor_status_user_id ON vendor_status (user_id);
CREATE INDEX idx_vendor_status_grupo_id ON vendor_status (grupo_id);