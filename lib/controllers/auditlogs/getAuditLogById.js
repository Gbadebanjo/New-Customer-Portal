import AuditLog from '@/database/models/AuditLog';

export default async function getAuditLogById(auditLogId) {
    const auditLog = await AuditLog.findByPk(auditLogId, { raw: true });
    return { auditLog };
}
