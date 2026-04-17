'use server'
import SupportQuery from '@/database/models/SupportQuery';
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export default async function deleteSupportQueryById(supportQueryId) {
    const deletedSupportQuery = await SupportQuery.destroy({
        where: {
            id: supportQueryId
        }
    });
    console.log(`Support query with ID ${supportQueryId} deleted.`);
    console.log(`Deleted SupportQuery count: ${deletedSupportQuery}`);
    revalidatePath('/support')
    redirect('/support')
    return { deletedSupportQuery };
}
