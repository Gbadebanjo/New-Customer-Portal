import SiteDetail from '@/database/models/SiteDetail';

export default async function updateSiteDetailById(siteDetailId, newData) {
    const [updatedRowsCount] = await SiteDetail.update(newData, {
        where: {
            id: siteDetailId
        }
    });
    return { updatedRowsCount };
}
