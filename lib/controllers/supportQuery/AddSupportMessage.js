'use server'
import models from '@/database/models';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { revalidatePath } from 'next/cache';

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

    // revalidate the support pages (adjust path as needed)
    revalidatePath(`/support`);
    console.log('Added support message:', messageWithUser ? messageWithUser.toJSON() : null);
    return messageWithUser ? messageWithUser.toJSON() : null;
  } catch (err) {
    console.error('Error adding support message:', err);
    throw err;
  }
}