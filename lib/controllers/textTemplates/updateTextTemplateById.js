'use server'
import TextTemplate from '@/database/models/TextTemplate';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';

// Editable fields on a template row. `name` (the machine key like
// `Account.PasswordResetLink`) is deliberately excluded — repointing
// that key would let an attacker replace a security-critical outbound
// email (invitations, resets) with a template of their choosing and
// steal tokens embedded via the `{link}` / `{code}` placeholders.
const ALLOWED_FIELDS = ['display_name', 'content', 'inline_localized'];

export default async function updateTextTemplateById(textTemplateId, newData) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };

    const clean = {};
    for (const key of ALLOWED_FIELDS) {
        if (newData && Object.prototype.hasOwnProperty.call(newData, key)) {
            clean[key] = newData[key];
        }
    }

    const [updatedRowsCount] = await TextTemplate.update(clean, {
        where: {
            id: textTemplateId,
        },
    });
    return { updatedRowsCount };
}
