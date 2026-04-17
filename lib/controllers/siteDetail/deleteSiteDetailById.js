import SiteDetail from '@/database/models/SiteDetail';

export default async function deleteSiteDetailById(siteDetailId) {
    const deletedSiteDetail = await SiteDetail.destroy({
        where: {
            id: siteDetailId
        }
    });
    return { deletedSiteDetail };
}
