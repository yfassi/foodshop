import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = 'modisknrblsddpmzmhja';

if (!DB_PASSWORD) {
  console.error('DB_PASSWORD env var is required');
  process.exit(1);
}

const ENCODED_PASSWORD = encodeURIComponent(DB_PASSWORD);

async function tryConnect(config, label) {
  console.log(`Trying ${label}...`);
  try {
    const sql = postgres(config);
    const result = await sql`SELECT 1 as test`;
    console.log(`  Connected via ${label}!`);
    return sql;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    return null;
  }
}

async function main() {
  let sql = null;

  // Method 1: Direct connection (using config object to avoid URL encoding issues)
  sql = await tryConnect({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: DB_PASSWORD,
    connect_timeout: 10,
    ssl: 'require',
  }, 'direct connection');

  // Method 2: Pooler connections
  const regions = ['eu-west-3', 'us-east-1', 'eu-central-1', 'us-west-1', 'ap-southeast-1'];
  for (const region of regions) {
    if (sql) break;
    sql = await tryConnect({
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      username: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      connect_timeout: 10,
      ssl: 'require',
    }, `pooler ${region}`);
  }

  if (!sql) {
    console.error('\nCould not connect to database.');
    process.exit(1);
  }

  // Execute schema
  console.log('\nExecuting schema.sql...');
  const schemaSQL = readFileSync(resolve(__dirname, '../supabase/schema.sql'), 'utf8');
  try {
    await sql.unsafe(schemaSQL);
    console.log('Schema created successfully!');
  } catch (err) {
    console.error('Schema error:', err.message);
  }

  // Execute seed
  console.log('\nExecuting seed.sql...');
  const seedSQL = readFileSync(resolve(__dirname, '../supabase/seed.sql'), 'utf8');
  try {
    await sql.unsafe(seedSQL);
    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
  }

  await sql.end();
  console.log('\nDone!');
}

main().catch(console.error);
