const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Ensure pg is installed in the workspace or temp folder
try {
  require.resolve('pg');
} catch (e) {
  console.log('Installing pg module...');
  execSync('npm install pg', { stdio: 'inherit' });
}

const { Client } = require('pg');

// 2. Read env variables manually
const envPath = '/Users/cleissonteixeira/F5-Recompra/.env.local';
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found!');
  process.exit(1);
}

const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const connectionString = env.DATABASE_URL || env.DIRECT_URL;
if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL not found in .env.local!');
  process.exit(1);
}

console.log('Connecting to database...');
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected!');

  const migrationPath = '/Users/cleissonteixeira/F5-Recompra/supabase/migrations/025_backfill_cadencia_5.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('Starting transaction and migration...');
    
    // Listen to notice events from RAISE NOTICE
    client.on('notice', (msg) => {
      console.log('NOTICE:', msg.message);
    });

    await client.query(sql);
    
    console.log('Migration 025 applied and validated successfully!');
  } catch (err) {
    console.error('Error during migration, rolling back:', err);
    await client.query('ROLLBACK;').catch(e => console.error('Rollback error:', e));
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
