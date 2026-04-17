'use server'
import SecurityLogs from '@/database/models/SecurityLog';

export default async function addSecurityLogs(securityLogsData) {
    const newSecurityLogs = await SecurityLogs.create(securityLogsData);
    return { securityLogs: newSecurityLogs };
}
