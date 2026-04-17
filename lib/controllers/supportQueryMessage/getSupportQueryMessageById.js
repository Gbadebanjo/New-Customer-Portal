'use server'
import SupportQueryMessage from '@/database/models/SupportQueryMessage';

export default async function getSupportQueryMessageById(supportQueryMessageId) {
    const supportQueryMessage = await SupportQueryMessage.findByPk(supportQueryMessageId, { raw: true });
    return { supportQueryMessage };
}
