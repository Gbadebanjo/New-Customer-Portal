import Report from '@/database/models/Report';

export const dynamic = "force dynamic";

export default async function getAllReports(){
    const report = await Report.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return {report};
}
