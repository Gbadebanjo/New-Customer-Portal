import AuditLog from '@/database/models/AuditLog';

export const dynamic = "force dynamic";

export default async function getAllAuditLogs() {
    const auditLogs = await AuditLog.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return { auditLogs };
}
