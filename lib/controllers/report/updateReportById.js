'use server'
import Report from '@/database/models/Report';
import {revalidatePath} from "next/cache";

export default async function updateReportById(reportId, newData) {
    const updatedReport = await Report.update(newData, {
        where: {
            id: reportId
        }
    });
    revalidatePath('/reports')
    return { updatedReport };
}
