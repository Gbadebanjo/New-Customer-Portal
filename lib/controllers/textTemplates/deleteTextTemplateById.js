import TextTemplate from '@/database/models/Texttemplate';

export default async function deleteTextTemplateById(textTemplateId) {
    const deletedTextTemplate = await TextTemplate.destroy({
        where: {
            id: textTemplateId
        }
    });
    return { deletedTextTemplate };
}
