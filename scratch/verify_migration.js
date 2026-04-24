const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT COUNT(*) FROM produtos WHERE imagem_url LIKE 'data:image/%'")
  .then(res => {
    console.log("Base64 count: " + res.rows[0].count);
    pool.end();
  })
  .catch(err => {
    console.error(err);
    pool.end();
  });
