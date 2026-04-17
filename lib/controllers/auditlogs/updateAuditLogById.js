import AuditLog from '@/database/models/AuditLog';

export default async function updateAuditLogById(auditLogId, newData) {
    const [updatedRowsCount] = await AuditLog.update(newData, {
        where: {
            id: auditLogId
        }
    });
    return { updatedRowsCount };
}
