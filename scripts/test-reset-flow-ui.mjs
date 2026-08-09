import 'dotenv/config';
import pg from 'pg';
import { chromium } from 'playwright';
import crypto from 'node:crypto';

// Reproduces the user's report: "After resetting my admin password, if I try
// to login using the same account again, I keep getting incorrect password."
//
// Flow driven exactly like a human:
//   1. Grab the admin user + insert a fresh reset token (mimics what the
//      forgotPassword email would deliver — we skip the mailbox roundtrip
//      because that's not what's under test).
//   2. Open /reset-password/{token}, type NEW_PW twice, submit.
//   3. Wait for the redirect back to /login.
//   4. Read the DB row and inspect the stored hash.
//   5. Attempt to log in with NEW_PW via the /login form.
//   6. Report what happened at each step.

const BASE = 'http://localhost:3000';
const NEW_PW = 'Test!Passw0rd-2026';

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

const { rows } = await c.query(
    `SELECT id, email, password FROM users WHERE email = 'o.adebanjo@shell.com' LIMIT 1`
);
const admin = rows[0];
console.log('Admin:', admin.email);
console.log('  password before (length):', admin.password?.length, ' (first 40):', admin.password?.slice(0, 40));

// Clear any lockout so login won't be blocked by state left from earlier tests
await c.query(
    `UPDATE users SET is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL WHERE id = $1`,
    [admin.id]
);

// Insert a fresh reset token
const token = crypto.randomBytes(24).toString('hex');
await c.query(`DELETE FROM verification_codes WHERE user_id = $1`, [admin.id]);
await c.query(
    `INSERT INTO verification_codes (id, user_id, code, expires_at, created_at, updated_at) VALUES ($1, $2, $3, NOW() + interval '10 minutes', NOW(), NOW())`,
    [crypto.randomUUID(), admin.id, token]
);
console.log('\nInserted reset token for admin');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const events = [];
page.on('console', (m) => events.push({ kind: 'console', level: m.type(), text: m.text() }));
page.on('pageerror', (err) => events.push({ kind: 'pageerror', text: err.message }));
page.on('response', (r) => {
    const url = r.url();
    if (r.status() >= 400 || url.includes('/reset-password') || url.includes('/login') || url.includes('/api/')) {
        events.push({ kind: 'response', status: r.status(), url });
    }
});

// --- STEP 1: submit reset ---
console.log('\n--- STEP 1: /reset-password/{token} — submit NEW_PW twice ---');
await page.goto(`${BASE}/reset-password/${token}`, { waitUntil: 'networkidle' });
await page.fill('input[name="password"]', NEW_PW);
await page.fill('input[name="confirm password"]', NEW_PW);
await page.click('button:has-text("Submit")');
await page.waitForTimeout(3000);
console.log('URL after reset submit:', page.url());
const body1 = await page.locator('body').innerText().catch(() => '');
const err1 = body1.split('\n').filter((l) => /error|failed|occurred|invalid/i.test(l)).slice(0, 5);
if (err1.length) console.log('  visible error text:', err1);

// --- STEP 2: read DB row back ---
const { rows: after } = await c.query(`SELECT password FROM users WHERE id = $1`, [admin.id]);
const storedAfter = after[0].password;
console.log('\n--- STEP 2: DB row after reset ---');
console.log('  stored (length):', storedAfter?.length, ' (first 40):', storedAfter?.slice(0, 40));
console.log('  changed from before?', storedAfter !== admin.password);

// STEP 3: verify with local scrypt — is the stored hash correct for NEW_PW?
function verify(stored, supplied) {
    const [hex, salt] = stored.split(':');
    const a = Buffer.from(hex, 'hex');
    const b = crypto.scryptSync(supplied, salt, 64);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
console.log('  local verify(stored, NEW_PW):', verify(storedAfter, NEW_PW));

// --- STEP 4: try to log in via the UI ---
console.log('\n--- STEP 4: /login with NEW_PW ---');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', admin.email);
await page.fill('input[name="password"]', NEW_PW);
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);
console.log('URL after login click:', page.url());
await page.screenshot({ path: 'scripts/reset-flow-after-login.png', fullPage: true });
const body2 = await page.locator('body').innerText().catch(() => '');
console.log('  FULL body text after login attempt:\n', body2.slice(0, 800));

// Also directly hit the login server action with fetch, so we see the raw result
console.log('\n--- Bypass UI: call login server action via fetch ---');
// Try DIRECT scrypt check: fetch admin row and verify locally with EACH candidate PW
const { rows: candidates } = await c.query(`SELECT password FROM users WHERE id = $1`, [admin.id]);
console.log('  current DB hash (first 40):', candidates[0].password.slice(0, 40));
console.log('  local verify(stored, NEW_PW):', verify(candidates[0].password, NEW_PW));
console.log('  local verify(stored, NEW_PW + trailing space):', verify(candidates[0].password, NEW_PW + ' '));

console.log('\n--- All events ---');
for (const e of events) console.log(JSON.stringify(e));

await browser.close();
await c.end();
