// Adds the Daystar logo to email templates that don't already have it,
// matching the shape used by Account.InvitationLink exactly. Idempotent:
// skips any template whose content already contains `cid:daystar-logo`.
//
// Run once:  node scripts/add-logo-to-templates.mjs
import 'dotenv/config';
import pg from 'pg';

const TARGETS = [
    'Account.EmailSecurityCode',
    'Account.PasswordResetLink',
    'Account.EmailConfirmationLink',
];

// The exact header shape the logo-less templates use today, captured as
// a regex so we match regardless of which title sits inside. The
// replacement wraps the same title in a header that includes the logo,
// mirroring Account.InvitationLink to the pixel.
const HEADER_RE = /<div style="background-color:\s*#0a1128;\s*color:\s*#ffffff;\s*padding:\s*24px 32px;\s*text-align:\s*center;">\s*<h2 style="margin:\s*0;\s*font-size:\s*24px;">([^<]+)<\/h2>\s*<\/div>/;

const buildHeader = (title) => `<div style="background-color: #0a1128; color: #ffffff; padding: 28px 32px 22px; text-align: center;">
      <img src="cid:daystar-logo" alt="Daystar Power" style="max-width: 160px; height: auto; margin: 0 auto 12px; display: block;" />
      <h2 style="margin: 0; font-size: 20px; font-weight: 500; letter-spacing: 0.3px;">${title}</h2>
    </div>`;

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

for (const name of TARGETS) {
    const { rows } = await c.query(
        'SELECT id, content FROM text_templates WHERE name = $1',
        [name]
    );
    if (rows.length === 0) {
        console.log(`- ${name}: not in DB, skipping`);
        continue;
    }
    const row = rows[0];
    if (row.content.includes('cid:daystar-logo')) {
        console.log(`- ${name}: already has logo, skipping`);
        continue;
    }
    const match = row.content.match(HEADER_RE);
    if (!match) {
        console.log(`- ${name}: header block didn't match expected pattern, skipping (edit manually)`);
        continue;
    }
    const title = match[1].trim();
    const updated = row.content.replace(HEADER_RE, buildHeader(title));
    await c.query(
        'UPDATE text_templates SET content = $1, updated_at = NOW() WHERE id = $2',
        [updated, row.id]
    );
    console.log(`✓ ${name}: added logo (title: "${title}")`);
}

await c.end();
console.log('\nDone.');
