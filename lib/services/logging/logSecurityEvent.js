import SecurityLogs from '@/database/models/SecurityLog';

/**
 * Log a security event. Call this directly from server actions where
 * headers() is available, passing ip and browserInfo explicitly if needed.
 */
export async function logSecurityEvent({ action, userId = null, userName = null, ip = 'unknown', browserInfo = '', extra = {} }) {
    try {
        await SecurityLogs.create({
            application_name: 'Daystar Customer Portal',
            identity: 'Customer Portal',
            action,
            user_id: userId ? String(userId) : null,
            user_name: userName,
            client_ip_address: ip,
            browser_info: browserInfo,
            creation_time: new Date(),
            extra_properties: Object.keys(extra).length ? JSON.stringify(extra) : null,
        });
    } catch (err) {
        console.error('[SecurityLog] Failed to write security event:', err?.message, err);
    }
}
