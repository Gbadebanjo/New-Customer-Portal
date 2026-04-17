'use server'
import SupportQuery from '@/database/models/SupportQuery';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export default async function updateSupportQueryById(supportQueryId, newData) {
    const [updatedRowsCount] = await SupportQuery.update(newData, {
        where: {
            id: supportQueryId
        }
    });
    revalidatePath('/support')
    redirect('/support')
    return { updatedRowsCount };
}
