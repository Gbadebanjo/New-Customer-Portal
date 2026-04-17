import SecurityLogs from '@/database/models/SecurityLog';

export default async function deleteSecurityLogsById(securityLogsId) {
    const deletedSecurityLogs = await SecurityLogs.destroy({
        where: {
            id: securityLogsId
        }
    });
    return { deletedSecurityLogs };
}
