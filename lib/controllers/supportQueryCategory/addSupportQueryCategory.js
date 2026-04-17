'use server'
import SupportQueryCategory from '@/database/models/SupportQueryCategory';

export default async function addSupportQueryCategory(supportQueryCategoryData) {
    const newSupportQueryCategory = await SupportQueryCategory.create(supportQueryCategoryData);
    return { supportQueryCategory: newSupportQueryCategory };
}
