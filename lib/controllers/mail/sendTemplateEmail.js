'use server';
import db from '@/database/models';
import { sendMail } from '@/lib/services/mail/sendMail';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';
import { logAuditEvent } from '@/lib/services/logging/logAuditEvent';

// Replaces {placeholder} tokens with fields from the per-recipient data
// object (name, email, …). Unknown placeholders are left alone so the
// admin can spot them in the preview / message.
function applyPlaceholders(str, data = {}) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, (_, key) => (data[key] !== undefined ? data[key] : `{${key}}`));
}

/**
 * Send a one-off email built from an existing DB template.
 *
 *  - `templateId` — required; must be a row in `text_templates`.
 *  - `recipientUserIds` — array of user IDs; we look up each user's email
 *    and (optionally) name for {name} substitution. Users with no email
 *    are skipped and reported in `failed`.
 *  - `subject` and `bodyHtml` — optional overrides. When omitted, the
 *    template's `display_name` becomes the subject and its `content`
 *    becomes the body.
 *
 * Returns { ok, sent, failed, skipped, errors }.
 * Gated behind requireWriteAdminAuth — DCA cannot send.
 */
export async function sendTemplateEmail({ templateId, recipientUserIds, subject, bodyHtml }) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { ok: false, error: gate.error };

    if (!templateId) return { ok: false, error: 'A template is required.' };
    if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
        return { ok: false, error: 'Pick at least one recipient.' };
    }

    const template = await db.TextTemplate.findByPk(templateId, { raw: true });
    if (!template) return { ok: false, error: 'Template not found.' };

    const users = await db.User.findAll({
        where: { id: recipientUserIds },
        raw: true,
    });

    const finalSubject = (subject || template.display_name || 'A message from Daystar Power').trim();
    const rawBody = bodyHtml || template.content || '';

    let sent = 0;
    let failed = 0;
    const errors = [];
    const skipped = [];

    await Promise.all(users.map(async (u) => {
        if (!u.email) {
            skipped.push({ userId: u.id, reason: 'no-email' });
            return;
        }
        try {
            const personalized = {
                name: [u.name, u.surname].filter(Boolean).join(' ') || u.username || 'there',
                email: u.email,
                username: u.username || '',
            };
            await sendMail({
                to: u.email,
                subject: applyPlaceholders(finalSubject, personalized),
                html: applyPlaceholders(rawBody, personalized),
                text: finalSubject,
            });
            sent++;
        } catch (err) {
            failed++;
            errors.push({ userId: u.id, email: u.email, error: err?.message || 'send-failed' });
        }
    }));

    try {
        await logAuditEvent({
            name: 'Custom Email Sent',
            userName: gate.user?.username || gate.user?.email || 'Admin',
            url: '/admin/text-templates',
            method: 'POST',
            extra: {
                templateId,
                templateName: template.name,
                recipientCount: recipientUserIds.length,
                sent,
                failed,
                skippedCount: skipped.length,
            },
        });
    } catch { /* non-fatal */ }

    return { ok: true, sent, failed, skipped: skipped.length, errors };
}
