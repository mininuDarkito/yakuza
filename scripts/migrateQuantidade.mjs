import { config } from "dotenv";
config({ path: ".env.local" });
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    try {
        await pool.query('ALTER TABLE vendas ALTER COLUMN quantidade TYPE numeric(10,2)');
        console.log("Successfully migrated vendas.quantidade to numeric(10,2)");
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        process.exit();
    }
}

migrate();
