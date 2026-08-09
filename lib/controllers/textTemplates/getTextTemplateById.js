'use server'
import TextTemplate from '@/database/models/TextTemplate';

export default async function getTextTemplateById(textTemplateId) {
    try {
        const textTemplate = await TextTemplate.findByPk(textTemplateId);
        const textTemplateObject = textTemplate ? textTemplate.toJSON() : null;
        return { textTemplate: textTemplateObject };
    } catch (error) {
        console.error('Error fetching text template by ID:', error);
        throw error;
    }
}
