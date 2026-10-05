import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const seedPath = path.resolve(__dirname, '../../../database/seed.sql');
  console.log(`Reading seed data from: ${seedPath}`);

  try {
    const sql = fs.readFileSync(seedPath, 'utf-8');
    console.log('Seeding PostgreSQL database with realistic Indian B2B AP data...');
    await pool.query(sql);
    console.log('✓ PostgreSQL seed completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
