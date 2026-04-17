'use server'
import SupportQueryStatus from '@/database/models/SupportQueryStatus';

export default async function addSupportQueryStatus(supportQueryStatusData) {
    const newSupportQueryStatus = await SupportQueryStatus.create(supportQueryStatusData);
    return { supportQueryStatus: newSupportQueryStatus };
}
