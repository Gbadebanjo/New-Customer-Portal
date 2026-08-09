import 'dotenv/config';
import pg from 'pg';
import { chromium } from 'playwright';
import { authenticator } from 'otplib';
import crypto from 'node:crypto';
import { encrypt } from '../lib/auth/ercryptTOTP.js';

function hashPassword(pw) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    return `${h}:${salt}`;
}

const BASE = 'http://localhost:3000';

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();
const { rows } = await c.query(`SELECT id, email FROM users WHERE email = 'o.adebanjo@shell.com' LIMIT 1`);
const admin = rows[0];
const NEW_PW = 'Test!Passw0rd-2026';
const hashed = hashPassword(NEW_PW);
const secret = authenticator.generateSecret();
await c.query(
    `UPDATE users SET password = $1, totp_enabled = true, totp_secret = $2, totp_temp_secret = NULL, is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL WHERE id = $3`,
    [hashed, encrypt(secret), admin.id]
);
await c.query(`DELETE FROM verification_codes WHERE user_id = $1`, [admin.id]);
// Clean up any test template from previous runs
await c.query(`DELETE FROM text_templates WHERE name LIKE 'Test.PlaywrightModal%'`);
await c.end();

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext().then((ctx) => ctx.newPage());

const events = [];
page.on('console', (m) => events.push({ kind: 'console', level: m.type(), text: m.text() }));
page.on('pageerror', (err) => events.push({ kind: 'pageerror', text: err.message, stack: err.stack?.split('\n').slice(0, 8).join('\n') }));
page.on('response', (r) => {
    if (r.status() >= 400) events.push({ kind: 'response', status: r.status(), url: r.url() });
});

// Login
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('input[name="email"]', admin.email);
await page.fill('input[name="password"]', NEW_PW);
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
const code = authenticator.generate(secret);
await page.fill('input[name="code"]', code);
await page.click('button:has-text("Verify")');
await page.waitForTimeout(4000);

// Text templates
await page.goto(`${BASE}/admin/text-templates`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// === Test 1: click "New Template" → modal → fill → save ===
console.log('\n--- TEST 1: New Template flow ---');
try {
    await page.click('button:has-text("New Template")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/templates-modal-open.png' });
    await page.fill('input[placeholder*="Account.MonthlyDigest"]', 'Test.PlaywrightModal');
    await page.fill('input[placeholder*="Monthly Performance"]', 'Test template from Playwright');
    await page.fill('textarea', '<p>Hello {name}, this is a test.</p>');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Create Template")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/templates-after-create.png' });
    const modalGone = await page.locator('text=Create email template').count() === 0;
    console.log('Modal closed after create?', modalGone);
} catch (err) {
    console.log('Test 1 threw:', err.message);
}

// === Test 2: click "Send" on a template → recipient list → send ===
console.log('\n--- TEST 2: Send flow (open compose modal) ---');
try {
    await page.click('button:has-text("Send")', { timeout: 3000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scripts/templates-send-modal.png' });
    const hasCompose = await page.locator('text=Compose from template').count() > 0;
    console.log('Send modal opened?', hasCompose);
} catch (err) {
    console.log('Test 2 threw:', err.message);
}

console.log('\n--- All events ---');
for (const e of events) console.log(JSON.stringify(e));

await browser.close();
