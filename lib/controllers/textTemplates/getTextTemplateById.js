'use server'
import TextTemplate from '@/database/models/TextTemplate';
export default async function getTextTemplateById(textTemplateId) {
    try {
        console.log('inside getTextTemplateById');
        const textTemplate = await TextTemplate.findByPk(textTemplateId);

        console.log('Retrieved textTemplate:', textTemplate);

        if (!textTemplate) {
            console.log(`No text template found with ID: ${textTemplateId}`);
        }

        const textTemplateObject = textTemplate ? textTemplate.toJSON() : null;

        console.log('Converted textTemplate:', textTemplateObject);

        return { textTemplate: textTemplateObject };
    } catch (error) {
        console.error('Error fetching text template by ID:', error);
        throw error;
    }
}
