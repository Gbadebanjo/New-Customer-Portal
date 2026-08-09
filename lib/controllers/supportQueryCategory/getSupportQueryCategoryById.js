'use server'
import SupportQueryCategory from '@/database/models/SupportQueryCategory';

export default async function getSupportQueryCategoryById(supportQueryCategoryId) {
    const supportQueryCategory = await SupportQueryCategory.findByPk(supportQueryCategoryId, { raw: true });
    return { supportQueryCategory };
}
