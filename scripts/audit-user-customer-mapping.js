// One-shot audit: list non-Daystar users that are missing customer_id.
// Under the master-key auth model, any non-Daystar role must be scoped
// to a customer. Run with: node scripts/audit-user-customer-mapping.js
import 'dotenv/config';
import pg from 'pg';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, username, email, customer, roles, not_active FROM users`
  );

  const buckets = {
    daystarFleet: [],
    scopedOk: [],
    scopedMissingCustomer: [],
    unknownRole: [],
  };

  for (const u of rows) {
    const roles = Array.isArray(u.roles) ? u.roles : [];
    if (roles.length === 0) {
      buckets.unknownRole.push(u);
      continue;
    }
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    if (isDaystar) {
      buckets.daystarFleet.push(u);
    } else if (u.customer) {
      buckets.scopedOk.push(u);
    } else {
      buckets.scopedMissingCustomer.push(u);
    }
  }

  const line = (u) =>
    `  - ${u.email} (${u.username}) roles=${(u.roles || []).map((r) => r?.name).join(',') || '—'} active=${!u.not_active}`;

  console.log(`Total users: ${rows.length}`);
  console.log(`\nDaystar fleet-wide users (${buckets.daystarFleet.length}):`);
  buckets.daystarFleet.forEach((u) => console.log(line(u)));

  console.log(`\nScoped users with a customer (${buckets.scopedOk.length}):`);
  buckets.scopedOk.forEach((u) => console.log(line(u)));

  console.log(`\nBROKEN — scoped users MISSING customer_id (${buckets.scopedMissingCustomer.length}):`);
  buckets.scopedMissingCustomer.forEach((u) => console.log(line(u)));

  console.log(`\nUsers with no roles at all (${buckets.unknownRole.length}):`);
  buckets.unknownRole.forEach((u) => console.log(line(u)));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
