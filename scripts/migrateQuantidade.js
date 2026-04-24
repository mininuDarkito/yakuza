const fs = require('fs');
const { Pool } = require('pg');

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL="?([^"\n]+)/);

if (match) {
    const pool = new Pool({ connectionString: match[1] });
    pool.query('ALTER TABLE vendas ALTER COLUMN quantidade TYPE numeric(10,2)').then(() => {
        console.log("Successfully migrated vendas.quantidade to numeric(10,2)");
        process.exit();
    }).catch(e => {
        console.error("Migration error:", e);
        process.exit();
    });
} else {
    console.error("DATABASE_URL not found in .env.local");
}
