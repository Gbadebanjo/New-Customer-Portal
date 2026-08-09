'use server'
import TextTemplate from '@/database/models/Texttemplate';

export default async function updateTextTemplateById(textTemplateId, newData) {
    const [updatedRowsCount] = await TextTemplate.update(newData, {
        where: {
            id: textTemplateId
        }
    });
    return { updatedRowsCount };
}
