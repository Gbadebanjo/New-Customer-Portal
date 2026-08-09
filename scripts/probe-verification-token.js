import 'dotenv/config';
import pg from 'pg';

const token = process.argv[2] || '533fbd99-28ce-41e9-a0b8-157764f9ce90';

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});
await client.connect();

const { rows } = await client.query(
  `SELECT code, user_id, expires_at, is_used, created_at FROM verification_codes WHERE code = $1`,
  [token]
);
console.log(`Token ${token}:`);
if (rows.length === 0) {
  console.log('  NOT FOUND');
} else {
  const r = rows[0];
  console.log(`  user_id:    ${r.user_id}`);
  console.log(`  expires_at: ${r.expires_at}`);
  console.log(`  is_used:    ${r.is_used}`);
  console.log(`  expired:    ${new Date(r.expires_at) < new Date()}`);
}

const { rows: recent } = await client.query(
  `SELECT code, user_id, expires_at, is_used FROM verification_codes ORDER BY created_at DESC LIMIT 5`
);
console.log('\nMost recent 5 codes:');
console.table(recent);

await client.end();
