'use strict';

// Bootstrap admin — the ONE user created when the DB is first seeded so
// there's someone who can log in and create every other account. Reads
// credentials from env vars so nothing sensitive lives in the repo, and
// is idempotent (skips when the target email already exists) so
// re-running `db:seed:all` on an existing database is safe.
//
// Required env vars:
//   BOOTSTRAP_ADMIN_EMAIL    — e.g. admin@example.com
//   BOOTSTRAP_ADMIN_PASSWORD — 12+ chars, will be scrypt-hashed
//
// Optional env vars:
//   BOOTSTRAP_ADMIN_USERNAME — defaults to the local-part of the email
//   BOOTSTRAP_ADMIN_NAME     — defaults to 'Master'
//   BOOTSTRAP_ADMIN_SURNAME  — defaults to 'Admin'
//   BOOTSTRAP_ADMIN_TIMEZONE — defaults to 'Africa/Lagos'
//
// If BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD is missing, the
// seeder logs a warning and exits without touching the DB — safe for
// CI runs that don't intend to seed users.

const crypto = require('crypto');

// Same scrypt shape lib/auth/hash.js expects at login time.
function hashUserPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashed = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${hashed}:${salt}`;
}

module.exports = {
    async up(queryInterface) {
        const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
        const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

        if (!email || !password) {
            console.warn(
                '[seed:user] Skipping bootstrap admin: BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must both be set. ' +
                'Set them in .env and re-run `npm run seed` to create the first admin.'
            );
            return;
        }
        if (password.length < 12) {
            throw new Error('[seed:user] BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
        }

        // Idempotent: skip if the account already exists so re-runs don't
        // duplicate or crash on the unique-email constraint.
        const [existing] = await queryInterface.sequelize.query(
            'SELECT id FROM users WHERE email = :email LIMIT 1',
            { replacements: { email }, type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        if (existing) {
            console.log(`[seed:user] Bootstrap admin ${email} already exists — skipping.`);
            return;
        }

        const username = process.env.BOOTSTRAP_ADMIN_USERNAME || email.split('@')[0];
        const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Master';
        const surname = process.env.BOOTSTRAP_ADMIN_SURNAME || 'Admin';
        const timezone = process.env.BOOTSTRAP_ADMIN_TIMEZONE || 'Africa/Lagos';

        // Insert via parameterised SQL — safer than bulkInsert +
        // Sequelize.literal for the JSONB array. Postgres constructs the
        // `roles` JSONB[] from a stringified JSON element.
        await queryInterface.sequelize.query(
            `INSERT INTO users (
                id, username, email, phone_number, name, surname, password,
                ammp_api_key, customer, roles, timezone,
                is_locked_out, not_active, email_confirmed, is_external,
                totp_enabled, failed_login_attempts,
                creation_time, modification_time, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), :username, :email, NULL, :name, :surname, :password,
                NULL, NULL, ARRAY[:roleJson]::jsonb[], :timezone,
                false, false, true, false,
                false, 0,
                NOW(), NOW(), NOW(), NOW()
            )`,
            {
                replacements: {
                    username,
                    email,
                    name,
                    surname,
                    password: hashUserPassword(password),
                    timezone,
                    roleJson: JSON.stringify({ name: 'Admin', isAssigned: true }),
                },
            }
        );

        console.log(`[seed:user] Bootstrap admin created: ${email} (role: Admin).`);
        console.log('[seed:user] Log in once and enrol 2FA to complete setup; then rotate BOOTSTRAP_ADMIN_PASSWORD out of your env.');
    },

    async down(queryInterface) {
        const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
        if (!email) return;
        await queryInterface.sequelize.query(
            'DELETE FROM users WHERE email = :email',
            { replacements: { email } }
        );
    },
};
