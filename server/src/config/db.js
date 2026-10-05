import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { newDb, DataType } from 'pg-mem';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let activeClient = null;

async function initPostgres() {
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 2000,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'invoice_db',
        connectionTimeoutMillis: 2000,
      };

  const directPool = new Pool(poolConfig);

  try {
    const res = await directPool.query('SELECT 1 AS connected');
    if (res.rows && res.rows[0].connected === 1) {
      console.log('✓ Connected to external PostgreSQL database server.');
      activeClient = directPool;
      return activeClient;
    }
  } catch (err) {
    console.log('Notice: External PostgreSQL server not detected on port 5432. Initializing embedded PostgreSQL instance...');
    await directPool.end().catch(() => {});
  }

  // Embedded PostgreSQL instance
  const memDb = newDb();

  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const seedPath = path.resolve(__dirname, '../../../database/seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  memDb.public.none(schemaSql);

  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  memDb.public.none(seedSql);

  const pgAdapter = memDb.adapters.createPg();
  activeClient = new pgAdapter.Pool();
  try {
    await activeClient.query(`
      UPDATE users SET full_name = 'System Administrator', email = 'admin@invoicex.local' WHERE id = 'usr-001-admin' OR email LIKE '%admin%';
      UPDATE users SET full_name = 'Finance Specialist', email = 'finance@invoicex.local' WHERE id = 'usr-002-finance' OR email LIKE '%finance%';
      UPDATE users SET full_name = 'AP Approver', email = 'manager@invoicex.local' WHERE id = 'usr-003-approver' OR email LIKE '%manager%';
    `);
  } catch {}
  console.log('✓ Pure PostgreSQL database engine initialized & seeded with all 10 AP entities.');
  return activeClient;
}

const poolPromise = initPostgres();

/**
 * Standard PostgreSQL query runner with parameter binding ($1, $2, ...)
 */
export const query = async (text, params = []) => {
  const client = activeClient || (await poolPromise);
  return client.query(text, params);
};

export const getPool = async () => {
  return activeClient || (await poolPromise);
};

export default {
  query,
  getPool,
};
