'use server'
import Report from '@/database/models/Report';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export default async function deleteReportById(reportId) {
    const deletedReport = await Report.destroy({
        where: {
            id: reportId
        }
    });
    revalidatePath('/reports')
    redirect('/reports')
    return { deletedReport };
}
