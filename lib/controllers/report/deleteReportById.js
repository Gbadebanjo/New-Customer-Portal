'use server'
import Report from '@/database/models/Report';
import {revalidatePath} from "next/cache";

export default async function deleteReportById(reportId) {
    const deletedReport = await Report.destroy({
        where: {
            id: reportId
        }
    });
    revalidatePath('/reports')
    return { deletedReport };
}
