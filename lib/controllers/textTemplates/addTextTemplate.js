'use server'
import TextTemplate from '@/database/models/TextTemplate';

export default async function addTextTemplate(textTemplateData) {
    const newTextTemplate = await TextTemplate.create(textTemplateData);
    return { textTemplate: newTextTemplate };
}
