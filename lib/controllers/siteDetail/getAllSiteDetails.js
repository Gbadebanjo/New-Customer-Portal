import SiteDetails from '@/database/models/SiteDetail';

export const dynamic = "force dynamic";

export default async function getAllSiteDetails(){
    const users = await SiteDetails.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return {users};
}
