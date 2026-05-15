const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("Conectando ao banco...");
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vendas' AND column_name = 'quantidade'
    `);

    if (res.rows.length > 0) {
      console.log("Coluna 'quantidade' encontrada. Renomeando para 'capitulo'...");
      await pool.query('ALTER TABLE vendas RENAME COLUMN quantidade TO capitulo');
      console.log("Sucesso! Coluna renomeada.");
    } else {
      const checkCap = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'vendas' AND column_name = 'capitulo'
      `);
      if (checkCap.rows.length > 0) {
        console.log("A coluna já está renomeada como 'capitulo'.");
      } else {
        console.log("Erro: Não encontrei nem 'quantidade' nem 'capitulo' na tabela 'vendas'.");
      }
    }
  } catch (err) {
    console.error("Erro ao executar SQL:", err.message);
  } finally {
    await pool.end();
  }
}

run();
