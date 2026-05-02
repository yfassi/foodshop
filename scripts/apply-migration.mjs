#!/usr/bin/env node
/**
 * Apply a single SQL migration to the production Supabase Postgres.
 *
 * Usage:
 *   DB_PASSWORD=… node scripts/apply-migration.mjs 016_stripe_billing.sql
 *
 * Connection logic mirrors scripts/setup-db.mjs: tries direct connection
 * first, then falls back to the regional poolers.
 */

import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "modisknrblsddpmzmhja";

const arg = process.argv[2];

if (!arg) {
  console.error("Usage: node scripts/apply-migration.mjs <migration_file.sql>");
  process.exit(1);
}

if (!DB_PASSWORD) {
  console.error("DB_PASSWORD env var is required");
  console.error("(get it from Supabase Dashboard → Settings → Database)");
  process.exit(1);
}

const migrationPath = resolve(__dirname, "../supabase/migrations", basename(arg));
let sqlText;
try {
  sqlText = readFileSync(migrationPath, "utf8");
} catch {
  console.error(`Cannot read migration file: ${migrationPath}`);
  process.exit(1);
}

async function tryConnect(config, label) {
  console.log(`Trying ${label}…`);
  try {
    const sql = postgres(config);
    await sql`SELECT 1`;
    console.log(`  Connected via ${label}.`);
    return sql;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    return null;
  }
}

async function main() {
  let sql = await tryConnect(
    {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: "postgres",
      username: "postgres",
      password: DB_PASSWORD,
      connect_timeout: 10,
      ssl: "require",
    },
    "direct connection"
  );

  const regions = [
    "eu-west-3",
    "us-east-1",
    "eu-central-1",
    "us-west-1",
    "ap-southeast-1",
  ];
  for (const region of regions) {
    if (sql) break;
    sql = await tryConnect(
      {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        username: `postgres.${PROJECT_REF}`,
        password: DB_PASSWORD,
        connect_timeout: 10,
        ssl: "require",
      },
      `pooler ${region}`
    );
  }

  if (!sql) {
    console.error("\nCould not connect to database.");
    process.exit(1);
  }

  console.log(`\nApplying ${basename(arg)}…`);
  try {
    await sql.unsafe(sqlText);
    console.log("✓ Migration applied successfully.");
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    await sql.end();
    process.exit(1);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
