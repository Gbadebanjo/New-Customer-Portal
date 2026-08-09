import 'dotenv/config';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const FAKE_EMAIL = 'nobody@example.com';
const WRONG_PASSWORD = 'wrongpw1234';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function tryLogin(n) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', FAKE_EMAIL);
    await page.fill('input[name="password"]', WRONG_PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for either the alert modal to appear OR page to change
    await page.waitForTimeout(2000);
    // Grab whatever's in the alert modal
    const modalText = await page.locator('dialog[open]').innerText().catch(() => '');
    const body = await page.locator('body').innerText().catch(() => '');
    const src = modalText || body;
    const line = src.split('\n').find((l) => /authenticate|credentials|suspended|network|please try|too many/i.test(l)) || '(no visible message)';
    console.log(`Attempt ${n}: ${line}`);
}

for (let i = 1; i <= 5; i++) {
    await tryLogin(i);
}

await browser.close();
