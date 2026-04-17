'use server'
import SupportQueryMessage from '@/database/models/SupportQueryMessage';

export default async function updateSupportQueryMessageById(supportQueryMessageId, newData) {
    const [updatedRowsCount] = await SupportQueryMessage.update(newData, {
        where: {
            id: supportQueryMessageId
        }
    });
    return { updatedRowsCount };
}
