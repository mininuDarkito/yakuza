const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("Aplicando índices de performance...");
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vendas_user_id_data ON vendas(user_id, data_venda DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vendas_produto_id ON vendas(produto_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vendas_grupo_id ON vendas(grupo_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_produtos_link_serie ON produtos(link_serie)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_series_user_id ON user_series(user_id)');
    
    // Tentativa de habilitar pg_trgm para busca rápida
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops)');
        console.log("Extensão pg_trgm habilitada e índice de busca criado.");
    } catch (e) {
        console.warn("Aviso: Não foi possível criar índice trgm (provavelmente falta de permissão ou extensão não suportada).");
    }

    console.log("Sucesso! Índices aplicados.");
  } catch (err) {
    console.error("Erro ao aplicar índices:", err.message);
  } finally {
    await pool.end();
  }
}

run();
