import SecurityLogs from '@/database/models/SecurityLog';

export default async function getSecurityLogsById(securityLogsId) {
    const securityLogs = await SecurityLogs.findByPk(securityLogsId, { raw: true });
    return { securityLogs };
}
