import TextTemplate from '@/database/models/TextTemplate';

export const dynamic = "force dynamic";

// Names in the `StandardEmailTemplates.*` namespace are infrastructure —
// the outer HTML wrapper and the {message} partial that other templates
// compose into. They're not standalone emails, so keep them out of the
// admin list (they'd render as blank cards after HTML stripping).
const SYSTEM_TEMPLATE_PREFIX = 'StandardEmailTemplates.';

export default async function getAllTextTemplates(){
    const all = await TextTemplate.findAll({ raw: true });
    const textTemplates = all.filter((t) => !t.name?.startsWith(SYSTEM_TEMPLATE_PREFIX));
    return {textTemplates};
}
