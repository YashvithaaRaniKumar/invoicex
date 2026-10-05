import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  console.log(`Reading PostgreSQL schema from: ${schemaPath}`);

  try {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('Applying PostgreSQL schema DDL...');
    await pool.query(sql);
    console.log('✓ PostgreSQL schema migration executed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
