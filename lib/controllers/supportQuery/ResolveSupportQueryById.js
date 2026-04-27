'use server'
import SupportQuery from '@/database/models/SupportQuery';
import { revalidatePath } from 'next/cache';
import getAllSupportQueryStatuses from '@/lib/controllers/supportQueryStatus/getAllSupportQueryStatuses';

export default async function ResolveSupportQueryById(supportQueryId) {
    const statuses = await getAllSupportQueryStatuses();
    const resolvedStatus = statuses.supportQueryStatuses.find(status => status.name === 'Resolved');

    if (!resolvedStatus) {
        throw new Error('Resolved status not found');
    }

    const resolvedStatusId = resolvedStatus.id;

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

    revalidatePath('/support');
    return { updatedRowsCount };
}
