import SupportQueryStatus from '@/database/models/SupportQueryStatus';

export default async function deleteSupportQueryStatusById(supportQueryStatusId) {
    const deletedSupportQueryStatus = await SupportQueryStatus.destroy({
        where: {
            id: supportQueryStatusId
        }
    });
    return { deletedSupportQueryStatus };
}
