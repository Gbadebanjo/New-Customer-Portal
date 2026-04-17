import SupportQueryCategory from '@/database/models/SupportQueryCategory';

export default async function updateSupportQueryCategoryById(supportQueryCategoryId, newData) {
    const [updatedRowsCount] = await SupportQueryCategory.update(newData, {
        where: {
            id: supportQueryCategoryId
        }
    });
    return { updatedRowsCount };
}
