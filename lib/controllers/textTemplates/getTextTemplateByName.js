'use server'
import TextTemplate from '@/database/models/Texttemplate';

export default async function getTextTemplateByName(name) {
    try {
        const textTemplate = await TextTemplate.findOne({ where: { name }, raw: true });
        return { textTemplate: textTemplate || null };
    } catch (error) {
        console.error('Error fetching text template by name:', error);
        return { textTemplate: null };
    }
}
