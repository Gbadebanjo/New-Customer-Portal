import 'dotenv/config';
import pg from 'pg';
import { chromium } from 'playwright';
import { authenticator } from 'otplib';
import crypto from 'node:crypto';
import { encrypt } from '../lib/auth/ercryptTOTP.js';

// Match app's lib/auth/hash.js — scryptSync, not bcrypt.
function hashPassword(pw) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    return `${h}:${salt}`;
}

const BASE = 'http://localhost:3000';

// Pick a Daystar-role user; force totp_enabled=true + set a fresh totp_secret
// and a known password so the test is deterministic. Undoes any lockout too.
async function primeAdminUser() {
    const c = new pg.Client({
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
    });
    await c.connect();
    const { rows } = await c.query(
        `SELECT id, email, roles FROM users WHERE not_active = false LIMIT 5`
    );
    const admin = rows.find((u) => (u.roles || []).some((r) => r?.name === 'Admin')) || rows[0];
    const NEW_PASSWORD = 'Test!Passw0rd-2026';
    const hashed = hashPassword(NEW_PASSWORD);
    const secret = authenticator.generateSecret();
    await c.query(
        `UPDATE users SET password = $1, totp_enabled = true, totp_secret = $2, totp_temp_secret = NULL, is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL WHERE id = $3`,
        [hashed, encrypt(secret), admin.id]
    );
    console.log(`\n[primed] ${admin.email} — password reset + fresh TOTP secret`);
    await c.query(`DELETE FROM verification_codes WHERE user_id = $1`, [admin.id]);
    await c.end();
    return { admin, password: NEW_PASSWORD, secret };
}

const { admin, password, secret } = await primeAdminUser();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const events = [];
page.on('console', (m) => events.push({ kind: 'console', level: m.type(), text: m.text() }));
page.on('pageerror', (err) => events.push({ kind: 'pageerror', text: err.message, stack: err.stack?.split('\n').slice(0, 8).join('\n') }));
page.on('response', (r) => {
    const url = r.url();
    // capture API calls + any 4xx/5xx anywhere
    if (r.status() >= 400 || url.includes('/api/') || url.includes('/_next/data') || url.includes('/actions/')) {
        events.push({ kind: 'response', status: r.status(), url });
    }
});
page.on('requestfailed', (r) => {
    events.push({ kind: 'requestfailed', url: r.url(), err: r.failure()?.errorText });
});

const nav = [];
page.on('framenavigated', (f) => { if (f === page.mainFrame()) nav.push({ at: Date.now(), url: f.url() }); });

const t0 = Date.now();
console.log('--- STEP 1: /login ---');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('input[name="email"]', admin.email);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

console.log('URL now:', page.url());
const body1 = await page.locator('body').innerText().catch(() => '');
console.log('2FA screen visible?', body1.includes('Two-Factor Authentication'));

console.log('\n--- STEP 2: enter TOTP + verify ---');
const code = authenticator.generate(secret);
console.log('code:', code);
await page.fill('input[name="code"]', code);
await page.click('button:has-text("Verify")');

// Screenshot at 2s and 5s to catch what's visible during the "break"
await page.waitForTimeout(2000);
await page.screenshot({ path: 'scripts/admin-01-at-2s.png', fullPage: true });
console.log('URL @ 2s:', page.url());
const at2s = await page.locator('body').innerText().catch(() => '');
console.log('  body text (first 300 chars):', at2s.slice(0, 300).replace(/\s+/g, ' '));

await page.waitForTimeout(4000);
await page.screenshot({ path: 'scripts/admin-01-at-6s.png', fullPage: true });
console.log('URL @ 6s:', page.url());

await page.waitForTimeout(6000);
console.log('URL @ 12s:', page.url());
await page.screenshot({ path: 'scripts/admin-01-at-12s.png', fullPage: true });

const body2 = await page.locator('body').innerText().catch(() => '');
const errPhrases = ['occurred', 'went wrong', 'failed', 'error', 'section failed'];
const errLines = body2.split('\n').filter((l) => errPhrases.some((p) => l.toLowerCase().includes(p))).slice(0, 8);
if (errLines.length) console.log('  Visible error-like text:', errLines);

console.log('\n--- Navigation timeline ---');
for (const n of nav) console.log(`  +${((n.at - t0) / 1000).toFixed(2)}s`, n.url);

console.log('\n--- Console + page errors + 4xx/5xx responses ---');
for (const e of events) console.log(JSON.stringify(e));

await browser.close();
console.log('\nScreenshot: scripts/admin-01-after-verify.png');
