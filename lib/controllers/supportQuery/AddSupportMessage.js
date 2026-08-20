'use server'
import models from '@/database/models';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/auth';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Notify the customer's users whenever their support ticket gets a new
// reply. Skips the sender (they wrote it) and skips Daystar-side users on
// the customer's row (there shouldn't be any, but defence-in-depth). Best-
// effort — failures never block the message write.
async function notifyCustomerOfSupportReply({ query, senderId }) {
    try {
        if (!query?.customer) return;
        const users = await models.User.findAll({
            where: { customer: query.customer },
            raw: true,
        });
        const rows = users
            .filter((u) => u.id !== senderId)
            .map((u) => ({
                user_id: u.id,
                kind: 'ticket_update',
                title: 'New reply on your support ticket',
                body: query.title ? `New message on "${query.title}"` : 'You have a new message on a support ticket.',
                href: `/support/${query.id}`,
                metadata: { supportQueryId: query.id },
            }));
        if (rows.length) await models.Notification.bulkCreate(rows);
    } catch (err) {
        console.error('notifyCustomerOfSupportReply failed:', err?.message);
    }
}

// Post a reply on a support ticket. The caller must be authenticated
// AND either own the ticket (same customer) or be a Daystar-side user.
// `user_id` is DERIVED from the session — the request body's value is
// ignored so nobody can post replies attributed to another user.
export default async function AddSupportMessage({ support_query_id, response }) {
    try {
        const { user } = await verifyAuth();
        if (!user?.id) throw new Error('Not authenticated');

        if (!support_query_id || !response) {
            throw new Error('Missing required fields');
        }

        const caller = await models.User.findByPk(user.id, {
            attributes: ['id', 'roles', 'customer'],
            raw: true,
        });
        if (!caller) throw new Error('User not found');
        const roles = Array.isArray(caller.roles) ? caller.roles : [];
        const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

        const query = await models.SupportQuery.findByPk(support_query_id, { raw: true });
        if (!query) throw new Error('Support query not found');

        // Access: Daystar-side users can reply on any ticket; anyone
        // else must own it (same customer).
        if (!isDaystar && String(query.customer) !== String(caller.customer)) {
            throw new Error('Not authorised to reply on this ticket');
        }

        const created = await models.SupportQueryMessage.create({
            id: uuidv4(),
            message: xss(response),
            support_query_id,
            user_id: caller.id,
        });

        // return the message including its user details
        const messageWithUser = await models.SupportQueryMessage.findByPk(created.id, {
            include: [{ model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
        });

        // Fan out an in-app notification to the customer's users.
        try {
            await notifyCustomerOfSupportReply({ query, senderId: caller.id });
        } catch { /* non-fatal */ }

        revalidatePath('/support');
        return messageWithUser ? messageWithUser.toJSON() : null;
    } catch (err) {
        console.error('Error adding support message:', err);
        throw err;
    }
}
