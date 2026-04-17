'use server'
import SupportQueryMessage from '@/database/models/SupportQueryMessage';

export default async function deleteSupportQueryMessageById(supportQueryMessageId) {
    const deletedSupportQueryMessage = await SupportQueryMessage.destroy({
        where: {
            id: supportQueryMessageId
        }
    });
    return { deletedSupportQueryMessage };
}
