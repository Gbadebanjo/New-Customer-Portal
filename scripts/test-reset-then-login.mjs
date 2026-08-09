import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';

// Reproduce exactly what lib/auth/hash.js does. If this script's
// hash / verify pair agrees with the app's, the raw crypto is fine.
function hashUserPassword(pw) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    return `${h}:${salt}`;
}
function verifyPassword(stored, supplied) {
    const [hex, salt] = stored.split(':');
    const a = Buffer.from(hex, 'hex');
    const b = crypto.scryptSync(supplied, salt, 64);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

// Pick the same admin the login test uses
const { rows } = await c.query(
    `SELECT id, email, password FROM users WHERE email = 'o.adebanjo@shell.com' LIMIT 1`
);
const admin = rows[0];
console.log('\nAdmin:', admin.email);
console.log('Current stored password (first 60):', admin.password?.slice(0, 60), '...');
console.log('Current stored password LENGTH:', admin.password?.length);

const NEW_PW = 'Test!Passw0rd-2026';

// STEP A — simulate the RESET flow the same way the server action does:
//   hashUserPassword(pw) → user.password = hashed → user.save()
// This mirrors lib/controllers/users/updateUserPasswordById.js:
//   user.password = hashedPassword; await user.save();
const hashed = hashUserPassword(NEW_PW);
console.log('\n--- Reset: write new hash ---');
console.log('  will write (first 60):', hashed.slice(0, 60), '...');
console.log('  will write LENGTH:', hashed.length);

// Use plain Postgres UPDATE (bypasses Sequelize hooks entirely — this proves
// whether the plain-text DB write survives a round-trip).
await c.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, admin.id]);

// STEP B — read back exactly what's in the row now
const { rows: after } = await c.query(
    `SELECT password FROM users WHERE id = $1`, [admin.id]
);
const storedAfter = after[0].password;
console.log('\n--- After write: read back ---');
console.log('  stored (first 60):', storedAfter.slice(0, 60), '...');
console.log('  stored LENGTH:', storedAfter.length);
console.log('  identical to what we wrote?', storedAfter === hashed);

// STEP C — run the app's verify function against the DB value
const ok = verifyPassword(storedAfter, NEW_PW);
console.log('\n--- Verify with same plaintext ---');
console.log('  verifyPassword(stored, NEW_PW) =', ok);

// STEP D — also try what the app does when the user submits: exercise
// the same path but write via Sequelize's `user.save()` (which is what
// updateUserPasswordById actually uses — the hook trap goes here).
console.log('\n--- Now via Sequelize user.save() (matches app path) ---');
const { default: db } = await import('../database/models/index.js');
const u = await db.User.findByPk(admin.id);
const hashed2 = hashUserPassword(NEW_PW);
u.password = hashed2;
await u.save();

const { rows: after2 } = await c.query(
    `SELECT password FROM users WHERE id = $1`, [admin.id]
);
const storedAfter2 = after2[0].password;
console.log('  will write LENGTH:', hashed2.length);
console.log('  stored LENGTH:', storedAfter2.length);
console.log('  identical to what we wrote?', storedAfter2 === hashed2);
console.log('  verifyPassword(stored, NEW_PW) =', verifyPassword(storedAfter2, NEW_PW));

await c.end();
process.exit(0);
