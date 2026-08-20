'use server'
import db from '@/database/models';
import { revalidatePath } from 'next/cache';
import getAllSupportQueryStatuses from '@/lib/controllers/supportQueryStatus/getAllSupportQueryStatuses';
import { verifyAuth } from '@/lib/auth/auth';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Flip a ticket's status to 'Resolved'. Callable by Daystar-side users
// (NOC + admins) OR by the ticket's own customer users — customers can
// mark their own resolved once they're satisfied.
export default async function ResolveSupportQueryById(supportQueryId) {
    const { user } = await verifyAuth();
    if (!user?.id) throw new Error('Not authenticated');
    if (!supportQueryId) throw new Error('Missing ticket id');

    const caller = await db.User.findByPk(user.id, {
        attributes: ['id', 'roles', 'customer'],
        raw: true,
    });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

    const supportQuery = await db.SupportQuery.findByPk(supportQueryId);
    if (!supportQuery) throw new Error(`Support query with ID ${supportQueryId} not found`);

    if (!isDaystar && String(supportQuery.customer) !== String(caller?.customer)) {
        throw new Error('Not authorised');
    }

    const statuses = await getAllSupportQueryStatuses();
    const resolvedStatus = statuses.supportQueryStatuses.find((status) => status.name === 'Resolved');
    if (!resolvedStatus) throw new Error('Resolved status not found');

    const [updatedRowsCount] = await db.SupportQuery.update(
        { status_id: resolvedStatus.id },
        { where: { id: supportQueryId } }
    );

    revalidatePath('/support');
    return { updatedRowsCount };
}
