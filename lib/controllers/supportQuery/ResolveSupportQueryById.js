'use server'
import SupportQuery from '@/database/models/SupportQuery';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import getAllSupportQueryStatuses from '@/lib/controllers/supportQueryStatus/getAllSupportQueryStatuses';

export default async function ResolveSupportQueryById(supportQueryId) {

    console.log('inside ResolveSupportQueryById -Resolving SupportQuery with id ' + supportQueryId);
    // Get all statuses and find the status with the name 'Resolved'
    const statuses = await getAllSupportQueryStatuses();

    console.log('statuses ', JSON.stringify(statuses));
    const resolvedStatus = statuses.supportQueryStatuses.find(status => status.name === 'Resolved');
    console.log('resolvedStatus ', resolvedStatus);

    if (!resolvedStatus) {
        throw new Error('Resolved status not found');
    }

    const resolvedStatusId = resolvedStatus.id;
    console.log('resolvedStatusId ', resolvedStatusId);

    // Fetch the support query by its ID
    const supportQuery = await SupportQuery.findByPk(supportQueryId);

    if (!supportQuery) {
        throw new Error(`Support query with ID ${supportQueryId} not found`);
    }

    const newData = {
        ...supportQuery.dataValues,
        status_id: resolvedStatusId,
    };

    // Update the support query status to 'Resolved'
    const [updatedRowsCount] = await SupportQuery.update(newData, {
        where: {
            id: supportQueryId,
        },
    });

    // Revalidate the path and redirect to the support page
    revalidatePath('/support');
    redirect('/support');

    return { updatedRowsCount };
}
