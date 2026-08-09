'use server'
import models from '@/database/models';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { revalidatePath } from 'next/cache';

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

export default async function AddSupportMessage({ support_query_id, user_id, response }) {
  try {
    if (!support_query_id || !user_id || !response) {
      throw new Error('Missing required fields');
    }

    const created = await models.SupportQueryMessage.create({
      id: uuidv4(),
      message: xss(response),
      support_query_id,
      user_id
    });

    // return the message including its user details
    const messageWithUser = await models.SupportQueryMessage.findByPk(created.id, {
      include: [{ model: models.User, as: 'user', attributes: ['id','name','surname','email'] }]
    });

    // Fan out an in-app notification to the customer's users. Fetch the
    // parent query so we know which customer and which title.
    try {
      const query = await models.SupportQuery.findByPk(support_query_id, { raw: true });
      if (query) await notifyCustomerOfSupportReply({ query, senderId: user_id });
    } catch { /* non-fatal */ }

    // revalidate the support pages (adjust path as needed)
    revalidatePath(`/support`);
    return messageWithUser ? messageWithUser.toJSON() : null;
  } catch (err) {
    console.error('Error adding support message:', err);
    throw err;
  }
}