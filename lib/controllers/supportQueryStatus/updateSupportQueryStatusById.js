import SupportQueryStatus from '@/database/models/SupportQueryStatus';

export default async function updateSupportQueryStatusById(supportQueryStatusId, newData) {
    const [updatedRowsCount] = await SupportQueryStatus.update(newData, {
        where: {
            id: supportQueryStatusId
        }
    });
    return { updatedRowsCount };
}
