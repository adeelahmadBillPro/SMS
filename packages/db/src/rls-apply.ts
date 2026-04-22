/**
 * Apply every .sql file in infra/rls/ to the database, in filename order.
 * Runs as the superuser from DATABASE_URL. Substitutes psql-style
 *   :'shopos_app_password'  →  '<env value, SQL-quoted>'
 * Idempotent — individual SQL files use DO $$ ... $$ guards.
 */
import { Client } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "./env";

const RLS_DIR = resolve(__dirname, "../../../infra/rls");

function sqlQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function substitute(sql: string, vars: Record<string, string>): string {
  let out = sql;
  for (const [k, v] of Object.entries(vars)) {
    const pattern = new RegExp(`:'${k}'`, "g");
    out = out.replace(pattern, sqlQuote(v));
  }
  return out;
}

async function main() {
  const files = readdirSync(RLS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql files found in ${RLS_DIR}`);
    process.exit(1);
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  const vars = {
    shopos_app_password: env.SHOPOS_APP_PASSWORD,
    shopos_admin_password: env.SHOPOS_ADMIN_PASSWORD,
  };

  try {
    for (const file of files) {
      const path = resolve(RLS_DIR, file);
      const raw = readFileSync(path, "utf8");
      const sql = substitute(raw, vars);
      process.stdout.write(`Applying ${file}... `);
      await client.query(sql);
      process.stdout.write("ok\n");
    }
    console.log(`Applied ${files.length} RLS file(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
