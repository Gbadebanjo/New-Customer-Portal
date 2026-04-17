'use server'
import SupportQueryMessage from '@/database/models/SupportQueryMessage';

export default async function addSupportQueryMessage(supportQueryMessageData) {
    const newSupportQueryMessage = await SupportQueryMessage.create(supportQueryMessageData);
    return { supportQueryMessage: newSupportQueryMessage };
}
