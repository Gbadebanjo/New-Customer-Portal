// One-off seed: insert the missing `Account.InvitationLink` row into
// text_templates so admins can edit it from Admin → Text Templates.
// Uses `cid:daystar-logo` — resolved by SendGrid's inline attachment
// (see lib/services/mail/sendMail.js).
import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'crypto';

const NAME = 'Account.InvitationLink';
const DISPLAY = 'Invitation Email';

const HTML = `<div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
    <div style="background-color: #0a1128; color: #ffffff; padding: 28px 32px 22px; text-align: center;">
      <img src="cid:daystar-logo" alt="Daystar Power" style="max-width: 160px; height: auto; margin: 0 auto 12px; display: block;" />
      <h2 style="margin: 0; font-size: 20px; font-weight: 500; letter-spacing: 0.3px;">You've Been Invited</h2>
    </div>
    <div style="padding: 32px; color: #333;">
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px;">You've been invited to join the <strong>Daystar Power Customer Portal</strong>. Click the button below to set up your password and activate your account.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="{link}" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
          Set Up My Account
        </a>
      </div>
      <p style="font-size: 14px; color: #555;">This link will expire in 10 minutes. If you were not expecting this invitation, you can safely ignore this email.</p>
      <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
    </div>
    <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
      <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
    </div>
  </div>
</div>`;

const c = new pg.Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASS,
});
await c.connect();

const existing = await c.query('SELECT id FROM text_templates WHERE name = $1', [NAME]);
if (existing.rows.length > 0) {
    await c.query(
        `UPDATE text_templates SET display_name = $1, content = $2, updated_at = NOW() WHERE name = $3`,
        [DISPLAY, HTML, NAME]
    );
    console.log(`Updated existing ${NAME} row (${existing.rows[0].id})`);
} else {
    const r = await c.query(
        `INSERT INTO text_templates (id, name, display_name, inline_localized, content, created_at, updated_at)
         VALUES ($1, $2, $3, 'yes', $4, NOW(), NOW()) RETURNING id`,
        [randomUUID(), NAME, DISPLAY, HTML]
    );
    console.log(`Inserted ${NAME} row (${r.rows[0].id})`);
}
await c.end();
