import SupportQueryCategory from '@/database/models/SupportQueryCategory';

export const dynamic = "force dynamic";

export default async function getAllSupportQueryCategories() {
    const supportQueryCategories = await SupportQueryCategory.findAll({ raw: true });
    return { supportQueryCategories };
}
