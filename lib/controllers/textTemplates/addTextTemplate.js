'use server'
import { revalidatePath } from 'next/cache';
import TextTemplate from '@/database/models/TextTemplate';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';

const SYSTEM_TEMPLATE_PREFIX = 'StandardEmailTemplates.';

export default async function addTextTemplate(textTemplateData) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };

    const name = (textTemplateData?.name || '').trim();
    const displayName = (textTemplateData?.display_name || '').trim();
    const content = textTemplateData?.content ?? '';

    if (!name || !displayName || !content) {
        return { error: 'System name, display name, and content are required.' };
    }

    // Reserve the system namespace — those rows are layout infrastructure
    // and shouldn't be created via the admin UI.
    if (name.startsWith(SYSTEM_TEMPLATE_PREFIX)) {
        return { error: `System name cannot start with "${SYSTEM_TEMPLATE_PREFIX}" — that prefix is reserved for layout templates.` };
    }

    // Enforce uniqueness on `name` — every consumer looks templates up by
    // this key, so duplicates would make lookups ambiguous.
    const existing = await TextTemplate.findOne({ where: { name } });
    if (existing) {
        return { error: `A template named "${name}" already exists.` };
    }

    const textTemplate = await TextTemplate.create({
        name,
        display_name: displayName,
        content,
        inline_localized: 'yes',
    });
    revalidatePath('/admin/text-templates');
    return { textTemplate: textTemplate.toJSON() };
}
