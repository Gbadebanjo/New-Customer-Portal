'use server'
import Report from '@/database/models/Report';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export default async function updateReportById(reportId, newData) {
    const updatedReport = await Report.update(newData, {
        where: {
            id: reportId
        }
    });
    revalidatePath('/reports')
    redirect('/reports')
    return { updatedReport };
}
