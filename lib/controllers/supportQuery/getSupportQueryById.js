'use server'
import models from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Ticket detail carries user emails on both the owner and every
// message author, so it must be gated. Non-Daystar callers can only
// read tickets that belong to their own customer.
export async function getSupportQueryById(supportQueryId) {
    try {
        const { user } = await verifyAuth();
        if (!user?.id) return { supportQuery: null, error: 'Not authenticated' };

        const caller = await models.User.findByPk(user.id, {
            attributes: ['id', 'roles', 'customer'],
            raw: true,
        });
        const roles = Array.isArray(caller?.roles) ? caller.roles : [];
        const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

        const supportQuery = await models.SupportQuery.findByPk(supportQueryId, {
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] },
                { model: models.SupportQueryMessage, as: 'messages', include: [{ model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }] }
            ],
            order: [[{ model: models.SupportQueryMessage, as: 'messages' }, 'created_at', 'ASC']]
        });

        if (!supportQuery) return { supportQuery: null };
        const row = supportQuery.toJSON();
        if (!isDaystar && String(row.customer) !== String(caller?.customer)) {
            return { supportQuery: null, error: 'Not authorised' };
        }
        return { supportQuery: row };
    } catch (error) {
        throw error;
    }
}
