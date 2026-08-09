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

const { rows } = await client.query(
  `SELECT id, email, username, customer, roles, not_active, created_at FROM users ORDER BY created_at`
);
console.log(`Total users: ${rows.length}\n`);
for (const u of rows) {
  console.log(`- ${u.email} / ${u.username}`);
  console.log(`    id: ${u.id}`);
  console.log(`    customer: ${u.customer ?? '(null)'}`);
  console.log(`    roles: ${JSON.stringify(u.roles)}`);
  console.log(`    not_active: ${u.not_active}`);
  console.log('');
}

const { rows: customers } = await client.query(
  `SELECT id, company_name FROM customers ORDER BY company_name`
);
console.log(`\nCustomers: ${customers.length}`);
for (const c of customers) console.log(`- ${c.company_name} (${c.id})`);

await client.end();
