import 'dotenv/config';

const baseUrl = 'https://data-api.ammp.io';
const key = process.env.AMMP_MASTER_KEY || process.env.AMMP_API_KEY;

console.log('AMMP_MASTER_KEY set?', !!process.env.AMMP_MASTER_KEY, 'len:', process.env.AMMP_MASTER_KEY?.length ?? 0);
console.log('AMMP_API_KEY set?   ', !!process.env.AMMP_API_KEY);

if (!key) {
  console.log('NO KEY — that is the problem.');
  process.exit(1);
}

const tokRes = await fetch(`${baseUrl}/v1/token`, {
  method: 'POST',
  headers: { 'x-api-key': key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
});
const tok = await tokRes.json();
console.log('token status:', tokRes.status, 'access_token present?', !!tok.access_token);
if (!tok.access_token) { console.log(tok); process.exit(1); }

const gRes = await fetch(`${baseUrl}/v1/asset_groups`, {
  headers: { 'Authorization': `Bearer ${tok.access_token}`, 'Accept': 'application/json' },
});
const g = await gRes.json();
console.log('asset_groups status:', gRes.status, 'array?', Array.isArray(g), 'len:', Array.isArray(g) ? g.length : 'n/a');
if (Array.isArray(g)) {
  console.log('\nFirst 3 raw entries:');
  console.log(JSON.stringify(g.slice(0, 3), null, 2));
  const customers = g
    .map((x) => (x?.group_name || x?.name || '').trim())
    .filter((n) => /^\[customer\]\s+/i.test(n))
    .map((n) => n.replace(/^\[customer\]\s+/i, ''));
  console.log(`\n[Customer] X matches: ${customers.length}`);
  console.log('First 10:', customers.slice(0, 10));
} else {
  console.log('Unexpected shape:', g);
}
