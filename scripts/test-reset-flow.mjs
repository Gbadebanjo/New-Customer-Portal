import 'dotenv/config';
import pg from 'pg';
import { chromium } from 'playwright';
import { randomUUID } from 'crypto';

const BASE = 'http://localhost:3000';

// Pick an existing user we can safely reset a password for and log what
// each step does. The user must NOT have totp_enabled=true or we won't
// go through the setup flow (which is the failure path we want to test).
async function pickTestUser() {
    const c = new pg.Client({
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
    });
    await c.connect();
    const { rows } = await c.query(
        `SELECT id, email, username, totp_enabled FROM users WHERE not_active = false LIMIT 5`
    );
    console.log('Candidate users:');
    console.table(rows);
    // Force the first candidate onto the setup-2FA path so we exercise
    // the full reset → set-password → 2FA-setup → dashboard flow.
    const target = rows[0];
    await c.query(
        `UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_temp_secret = NULL WHERE id = $1`,
        [target.id]
    );
    console.log(`\n[test setup] Forced ${target.email} totp_enabled=false\n`);
    await c.end();
    return { ...target, totp_enabled: false };
}

// Insert a fresh verification code (uuid) for the given user, expiring
// 10 min from now — exactly what generateLink / generateInviteLink does.
async function issueToken(userId) {
    const c = new pg.Client({
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
    });
    await c.connect();
    // Clear any stale token for this user first — the table has a
    // UNIQUE (user_id) constraint that would otherwise reject the insert.
    await c.query(`DELETE FROM verification_codes WHERE user_id = $1`, [userId]);
    const token = randomUUID();
    await c.query(
        `INSERT INTO verification_codes (id, user_id, code, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() + interval '10 minutes', NOW(), NOW())`,
        [randomUUID(), userId, token]
    );
    await c.end();
    return token;
}

const user = await pickTestUser();
if (!user) throw new Error('No test user available');
console.log(`\nUsing user ${user.email} (id ${user.id}), totp_enabled=${user.totp_enabled}`);

const token = await issueToken(user.id);
console.log(`Issued token: ${token}`);
console.log(`Reset URL:    ${BASE}/reset-password/${token}\n`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const events = [];
page.on('console', (m) => events.push({ kind: 'console', level: m.type(), text: m.text() }));
page.on('pageerror', (err) => events.push({ kind: 'pageerror', text: err.message, stack: err.stack }));
page.on('response', (r) => {
    if (r.status() >= 400) events.push({ kind: 'response', status: r.status(), url: r.url() });
});

console.log('--- STEP 1: open reset-password page ---');
await page.goto(`${BASE}/reset-password/${token}`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(500);
console.log('URL:', page.url());

console.log('\n--- STEP 2: fill password + submit ---');
const NEW_PASSWORD = 'Test!Passw0rd-2026';
await page.fill('input[name="password"]', NEW_PASSWORD);
await page.fill('input[name="confirm password"]', NEW_PASSWORD);
await page.screenshot({ path: 'scripts/reset-01-filled.png' });
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'scripts/reset-02-submitted.png' });
console.log('URL after submit:', page.url());

// Capture any modal text
const modalText = await page.locator('body').innerText().catch(() => '');
if (/error|failed|occurred|wrong/i.test(modalText)) {
    const errFragment = modalText.split('\n').filter((l) => /error|failed|occurred|wrong/i.test(l)).slice(0, 5);
    console.log('Visible error text on page:', errFragment);
}

if (page.url().includes('/login')) {
    console.log('\n--- STEP 3: on /login — attempting sign-in ---');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('URL after login submit:', page.url());
    await page.screenshot({ path: 'scripts/reset-03-after-login.png' });

    const bodyAfterLogin = await page.locator('body').innerText().catch(() => '');
    const setupVisible = bodyAfterLogin.includes('Set up Two-Factor');
    console.log('Setup 2FA screen visible?', setupVisible);

    if (setupVisible) {
        console.log('\n--- STEP 4: enter TOTP code from decrypted secret ---');
        // Read the fresh totp_temp_secret directly from DB, decrypt with the
        // app's own routine, generate the current OTP, submit it.
        const { decrypt } = await import('../lib/auth/ercryptTOTP.js');
        const { authenticator } = await import('otplib');
        const c = new pg.Client({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
        });
        await c.connect();
        const { rows } = await c.query(
            `SELECT totp_temp_secret FROM users WHERE id = $1`, [user.id]
        );
        await c.end();
        const encSecret = rows[0]?.totp_temp_secret;
        if (!encSecret) { console.log('  ❌ no totp_temp_secret populated — startEnable2FA never ran'); }
        else {
            const secret = decrypt(encSecret);
            const code = authenticator.generate(secret);
            console.log('  generated TOTP code:', code);
            await page.fill('input[name="setupCode"]', code);
            await page.click('button:has-text("Enable & Sign in")');
            await page.waitForTimeout(5000);
            console.log('URL after enable submit:', page.url());
            await page.screenshot({ path: 'scripts/reset-04-after-enable.png' });
            const bodyAfterEnable = await page.locator('body').innerText().catch(() => '');
            const errLines = bodyAfterEnable.split('\n').filter((l) => /error|failed|occurred|wrong/i.test(l));
            if (errLines.length) console.log('  ⚠️  visible error text:', errLines.slice(0, 5));
        }
    } else if (/error|failed|occurred|wrong/i.test(bodyAfterLogin)) {
        console.log('Visible error text:', bodyAfterLogin.split('\n').filter((l) => /error|failed|occurred|wrong/i.test(l)).slice(0, 5));
    }
}

console.log('\n--- COLLECTED CONSOLE + NETWORK EVENTS ---');
for (const e of events) console.log(JSON.stringify(e));

await browser.close();
console.log('\nDONE. Screenshots: scripts/reset-01-filled.png, reset-02-submitted.png, reset-03-after-login.png');
