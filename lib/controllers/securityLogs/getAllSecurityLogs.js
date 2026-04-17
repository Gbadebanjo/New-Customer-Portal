import SecurityLogs from '@/database/models/SecurityLog';

export const dynamic = "force dynamic";

export default async function getAllSecurityLogs() {
    const securityLogs = await SecurityLogs.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return { securityLogs };
}
