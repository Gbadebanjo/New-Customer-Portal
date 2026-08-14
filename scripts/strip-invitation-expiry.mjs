// Removes the "This link will expire in 10 minutes." sentence from the
// Account.InvitationLink template. Idempotent — grep-and-replace only
// touches the specific sentence, safe to re-run.
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

const { rows } = await c.query(
    "SELECT id, content FROM text_templates WHERE name = 'Account.InvitationLink'"
);
if (rows.length === 0) {
    console.log('Account.InvitationLink not found; nothing to update.');
    await c.end();
    process.exit(0);
}

const before = rows[0].content;
// Strip the stale "expires in 10 minutes" sentence but keep the
// "If you were not expecting…" tail intact.
const after = before
    .replace(/This link will expire in 10 minutes\.\s*/, '')
    .replace(/This link will expire in \d+\s+(minute|hour|day)s?\.\s*/i, '');

if (before === after) {
    console.log('No expiry sentence found — already clean.');
} else {
    await c.query(
        'UPDATE text_templates SET content = $1, updated_at = NOW() WHERE id = $2',
        [after, rows[0].id]
    );
    console.log('Account.InvitationLink: expiry sentence removed.');
}

await c.end();
