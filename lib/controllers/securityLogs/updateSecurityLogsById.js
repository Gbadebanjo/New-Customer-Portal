import SecurityLogs from '@/database/models/SecurityLog';

export default async function updateSecurityLogsById(securityLogsId, newData) {
    const updatedSecurityLogs = await SecurityLogs.update(newData, {
        where: {
            id: securityLogsId
        }
    });
    return { updatedSecurityLogs };
}
