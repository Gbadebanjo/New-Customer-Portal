import 'dotenv/config';
import pg from 'pg';
import { chromium } from 'playwright';
import crypto from 'node:crypto';

// Reproduces the user report: "After resetting my admin password, if I try to
// login using the same account again, I keep getting incorrect password."
//
// Theory: the user got locked out (3 wrong password attempts), so they hit
// "Forgot password", reset successfully — but resetPassword does NOT clear
// the lockout flags. Login is blocked by the still-live lockout, and the UI
// shows "suspended due to failed login attempts", which the user reads as
// "incorrect password".

const BASE = 'http://localhost:3000';
const NEW_PW = 'Test!Passw0rd-2026';

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

const { rows } = await c.query(
    `SELECT id, email FROM users WHERE email = 'o.adebanjo@shell.com' LIMIT 1`
);
const admin = rows[0];

// --- SETUP: lock out the admin (mirrors what 3 failed attempts would do) ---
const startedAt = new Date();
const lockoutUntil = new Date(startedAt.getTime() + 15 * 60 * 1000);
await c.query(
    `UPDATE users SET is_locked_out = true, failed_login_attempts = 3, lockout_until = $1, lockout_started_at = $2 WHERE id = $3`,
    [lockoutUntil, startedAt, admin.id]
);
console.log('Admin state BEFORE reset:');
const before = await c.query(
    `SELECT is_locked_out, failed_login_attempts, lockout_until, lockout_started_at FROM users WHERE id = $1`,
    [admin.id]
);
console.log(' ', before.rows[0]);

// --- Insert a reset token as if forgot-password had emailed one ---
const token = crypto.randomBytes(24).toString('hex');
await c.query(`DELETE FROM verification_codes WHERE user_id = $1`, [admin.id]);
await c.query(
    `INSERT INTO verification_codes (id, user_id, code, expires_at, created_at, updated_at) VALUES ($1, $2, $3, NOW() + interval '10 minutes', NOW(), NOW())`,
    [crypto.randomUUID(), admin.id, token]
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext().then((ctx) => ctx.newPage());

// --- STEP 1: reset password via UI ---
console.log('\n--- STEP 1: submit /reset-password/{token} ---');
await page.goto(`${BASE}/reset-password/${token}`, { waitUntil: 'networkidle' });
await page.fill('input[name="password"]', NEW_PW);
await page.fill('input[name="confirm password"]', NEW_PW);
await page.click('button:has-text("Submit")');
await page.waitForTimeout(3000);
console.log('URL after reset submit:', page.url());

// --- STEP 2: inspect DB state AFTER reset ---
const after = await c.query(
    `SELECT is_locked_out, failed_login_attempts, lockout_until, lockout_started_at FROM users WHERE id = $1`,
    [admin.id]
);
console.log('\nAdmin state AFTER reset:');
console.log(' ', after.rows[0]);
console.log(' → is_locked_out still true?', after.rows[0].is_locked_out);

// --- STEP 3: try login with NEW_PW ---
console.log('\n--- STEP 3: /login with NEW_PW ---');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', admin.email);
await page.fill('input[name="password"]', NEW_PW);
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('URL after login click:', page.url());
const body = await page.locator('body').innerText().catch(() => '');
// Find the alert modal body
const errLines = body.split('\n').filter((l) => /suspended|credentials|authenticate|attempts|unlock/i.test(l)).slice(0, 4);
console.log('  visible alert-like text:', errLines.length ? errLines : '(none found — full body follows)');
if (!errLines.length) console.log('  FULL body:', body.slice(0, 500));

await browser.close();
await c.end();
