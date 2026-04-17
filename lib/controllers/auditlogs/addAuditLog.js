import AuditLog from '@/database/models/AuditLog';

export default async function addAuditLog(auditLogData) {
    try {
        const newAuditLog = await AuditLog.create(auditLogData);
        return {auditLog: newAuditLog};
    } catch (err) {
        console.error(err);
    }
}
