import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});
await client.connect();

const { rows: fks } = await client.query(`
  SELECT
    tc.table_name  AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name  AS parent_table,
    ccu.column_name AS parent_column,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
  ORDER BY child_table;
`);
console.log('FKs referencing users:');
console.table(fks);

const { rows: users } = await client.query(
  'SELECT id, email, username, not_active, created_at FROM users ORDER BY created_at'
);
console.log(`\nUsers currently in DB (${users.length}):`);
console.table(users);

await client.end();
