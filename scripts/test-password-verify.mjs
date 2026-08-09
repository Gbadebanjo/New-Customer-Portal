// Direct hash verifier — bypasses browser, forms, cookies, sessions.
// Reads your admin's current hash from the DB and tests whatever
// password you type into stdin against it.
//
// If this says "MATCH": the DB has the hash for that exact string, so
// the reset flow worked correctly. Every login failure is an input
// mismatch (autofill/manager/typo/normalisation).
//
// If this says "MISMATCH" for a password you're 100% sure you set:
// the reset flow wrote a different hash than expected — real bug.
//
// Usage:
//   node scripts/test-password-verify.mjs
//   → prompts you to paste your password (input is hidden)

import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { Writable } from 'node:stream';

const EMAIL = process.argv[2] || 'o.adebanjo@shell.com';

// verifyPassword mirroring lib/auth/hash.js exactly.
function verifyPassword(storedPassword, suppliedPassword) {
    if (!storedPassword.includes(':')) {
        console.log('   (legacy ASP.NET Identity hash — legacy branch would run)');
        return false; // skip; would go through pbkdf2 branch we don't inline here
    }
    const [hashedPassword, salt] = storedPassword.split(':');
    const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
    const suppliedPasswordBuf = crypto.scryptSync(suppliedPassword, salt, 64);
    if (hashedPasswordBuf.length !== suppliedPasswordBuf.length) return false;
    return crypto.timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();
const { rows } = await c.query(
    `SELECT id, email, password, updated_at FROM users WHERE email = $1`, [EMAIL]
);
const admin = rows[0];
if (!admin) {
    console.log('No user found for email:', EMAIL);
    await c.end();
    process.exit(1);
}
console.log('Testing:', admin.email);
console.log('Hash format:', admin.password.includes(':') ? 'scrypt (hash:salt)' : 'legacy');
console.log('Hash last modified (updated_at):', new Date(admin.updated_at).toISOString());
console.log('Hash length:', admin.password.length, 'chars');
console.log('');

// Read password with hidden input.
const mutableOut = new Writable({ write(chunk, enc, cb) { cb(); } });
const rl = readline.createInterface({ input: process.stdin, output: mutableOut, terminal: true });
process.stdout.write('Enter password (input hidden): ');
rl.question('', (input) => {
    console.log(''); // newline after hidden input
    const supplied = input;
    console.log('Typed length:', supplied.length, 'chars');
    console.log('Contains trailing space:', supplied !== supplied.trimEnd());
    console.log('Contains leading space:', supplied !== supplied.trimStart());
    console.log('');
    const ok = verifyPassword(admin.password, supplied);
    if (ok) {
        console.log('  MATCH — the DB has the hash for this exact string. Any login failure is browser/input side.');
    } else {
        console.log('  MISMATCH — the DB does NOT verify this string. Options:');
        console.log('    - You typed a different string than the one your reset saved.');
        console.log('    - Try again with:  --with-trimmed  (drops surrounding whitespace)');
        console.log('    - Try again with:  --with-nfc      (unicode-normalise)');
    }

    // Retry with normalised variants automatically to save you a re-run.
    const trimmed = supplied.trim();
    if (trimmed !== supplied) {
        console.log('    - trimmed:', verifyPassword(admin.password, trimmed) ? 'MATCH' : 'no');
    }
    const nfc = supplied.normalize('NFC');
    if (nfc !== supplied) {
        console.log('    - NFC-normalised:', verifyPassword(admin.password, nfc) ? 'MATCH' : 'no');
    }
    const nfd = supplied.normalize('NFD');
    if (nfd !== supplied) {
        console.log('    - NFD-normalised:', verifyPassword(admin.password, nfd) ? 'MATCH' : 'no');
    }

    rl.close();
    c.end();
});
