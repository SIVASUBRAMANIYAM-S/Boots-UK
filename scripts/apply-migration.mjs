/* global URL, fetch */
// Applies one Supabase migration over HTTPS (Management API), for networks that block
// direct PostgreSQL connections. Usage:
//   SUPABASE_ACCESS_TOKEN=<token> node --env-file=.env scripts/apply-migration.mjs <migration.sql>
// Pass the token on the command line only; never store it in a tracked file.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import process from 'node:process';

const [file] = process.argv.slice(2);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

function fail(message) {
  process.stderr.write(`✖ ${message}\n`);
  process.exit(1);
}

if (!file) fail('Pass the migration file path.');
if (!token)
  fail('Set SUPABASE_ACCESS_TOKEN (supabase.com/dashboard/account/tokens).');
if (!projectUrl)
  fail('EXPO_PUBLIC_SUPABASE_URL is missing; run with --env-file=.env.');

const projectRef = new URL(projectUrl).hostname.split('.')[0];
const version = basename(file).match(/^(\d{14})_(.+)\.sql$/);
if (!version)
  fail('Migration file must be named <14-digit-version>_<name>.sql.');

async function query(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await response.text();
  if (!response.ok)
    fail(`Supabase API ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : [];
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const [{ history }] = await query(
  "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history",
);
if (history) {
  const applied = await query(
    `SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ${quote(version[1])}`,
  );
  if (applied.length) {
    process.stdout.write(
      `✔ ${basename(file)} is already applied; nothing to do.\n`,
    );
    process.exit(0);
  }
}

// The migration wraps itself in BEGIN/COMMIT, so a failure leaves no partial schema.
await query(await readFile(file, 'utf8'));
if (history) {
  await query(
    `INSERT INTO supabase_migrations.schema_migrations (version, name)
     VALUES (${quote(version[1])}, ${quote(version[2])}) ON CONFLICT DO NOTHING`,
  );
}
// Make the new tables/functions visible to the app's REST API immediately.
await query("NOTIFY pgrst, 'reload schema'");
process.stdout.write(`✔ Applied ${basename(file)} to project ${projectRef}.\n`);
