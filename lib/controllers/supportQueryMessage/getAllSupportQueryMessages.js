import SupportQueryMessage from '@/database/models/SupportQueryMessage';

export const dynamic = "force dynamic";

export default async function getAllSupportQueryMessages() {
    const supportQueryMessages = await SupportQueryMessage.findAll({ raw: true });
    return { supportQueryMessages };
}
