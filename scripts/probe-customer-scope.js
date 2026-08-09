import 'dotenv/config';
import pg from 'pg';

const baseUrl = 'https://data-api.ammp.io';
const key = process.env.AMMP_MASTER_KEY || process.env.AMMP_API_KEY;

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});
await client.connect();

const { rows: users } = await client.query(
  `SELECT u.id, u.email, u.username, u.customer, u.roles, c.company_name
     FROM users u
     LEFT JOIN customers c ON c.id::text = u.customer
     ORDER BY u.created_at`
);
console.log('Users:');
for (const u of users) {
  console.log(`- ${u.email} (${u.username})`);
  console.log(`    roles: ${JSON.stringify(u.roles)}`);
  console.log(`    customer_id: ${u.customer ?? '(null)'}`);
  console.log(`    customer_name: ${u.company_name ?? '(null / missing)'}`);
}

// Fetch AMMP asset_groups and try to match each customer's name
const tokRes = await fetch(`${baseUrl}/v1/token`, {
  method: 'POST',
  headers: { 'x-api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
});
const { access_token } = await tokRes.json();

const gRes = await fetch(`${baseUrl}/v1/asset_groups`, {
  headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' },
});
const groups = await gRes.json();

const { rows: customers } = await client.query(`SELECT id, company_name FROM customers`);
console.log('\nCustomer → AMMP group match:');
for (const c of customers) {
  const want = `[customer] ${c.company_name.trim().toLowerCase()}`;
  const g = groups.find(x => (x.group_name || '').trim().toLowerCase() === want);
  if (g) {
    const mRes = await fetch(`${baseUrl}/v1/asset_groups/${g.group_id}/members`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' },
    });
    const body = await mRes.json();
    const list = Array.isArray(body?.members) ? body.members : Array.isArray(body) ? body : [];
    console.log(`- "${c.company_name}" → ${g.group_name} (${g.group_id})`);
    console.log(`    members: ${list.length}`);
    if (list.length > 0) console.log(`    first: ${JSON.stringify(list[0]).slice(0, 200)}`);
  } else {
    console.log(`- "${c.company_name}" → NO MATCHING GROUP`);
    const near = groups
      .map(g => g.group_name)
      .filter(n => n && n.toLowerCase().includes(c.company_name.toLowerCase().slice(0, 4)))
      .slice(0, 5);
    if (near.length) console.log(`    near matches: ${near.join(', ')}`);
  }
}

await client.end();
