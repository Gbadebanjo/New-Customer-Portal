import SupportQueryCategory from '@/database/models/SupportQueryCategory';

export default async function deleteSupportQueryCategoryById(supportQueryCategoryId) {
    const deletedSupportQueryCategory = await SupportQueryCategory.destroy({
        where: {
            id: supportQueryCategoryId
        }
    });
    return { deletedSupportQueryCategory };
}
