import AuditLog from '@/database/models/AuditLog';

export default async function deleteAuditLogById(auditLogId) {
    const deletedAuditLog = await AuditLog.destroy({
        where: {
            id: auditLogId
        }
    });
    return { deletedAuditLog };
}
