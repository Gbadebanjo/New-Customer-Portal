import { headers } from 'next/headers';

/**
 * Extract the caller's IP + user-agent from the current request. Safe
 * to call from any server action or route handler — returns sensible
 * fallbacks if the header context is unavailable (e.g. cron jobs).
 *
 * Every place that writes to security_logs / audit_logs should call
 * this so log rows carry consistent provenance data instead of the
 * previous mix of "::1", real IPs, and "unknown".
 */
export async function getRequestContext() {
    try {
        const h = await headers();
        const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
            || h.get('x-real-ip')
            || 'unknown';
        const browserInfo = h.get('user-agent') || '';
        return { ip, browserInfo };
    } catch {
        return { ip: 'unknown', browserInfo: '' };
    }
}
