import AuditLog from '@/database/models/AuditLog';

export async function logAuditEvent({
    name,
    userName = null,
    url = '',
    method = 'POST',
    hasException = false,
    duration = null,
    ip = 'unknown',
    extra = {},
}) {
    try {
        await AuditLog.create({
            name,
            user_name: userName,
            client_ip_address: ip,
            url,
            http_request: method,
            has_exception: String(hasException),
            duration,
            extra_properties: Object.keys(extra).length ? JSON.stringify(extra) : null,
        });
    } catch (err) {
        console.error('[AuditLog] Failed to write audit event:', err?.message);
    }
}
