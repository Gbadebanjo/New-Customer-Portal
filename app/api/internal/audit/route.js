import { NextResponse } from 'next/server';
import addAuditLog from '@/lib/controllers/auditlogs/addAuditLog';

export const dynamic = 'force-dynamic';

// Internal-only route — called from middleware. Not authenticated (middleware handles auth context).
// Protected by a shared secret so it cannot be called from the public internet.
export async function POST(request) {
    const secret = request.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_LOG_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        await addAuditLog({
            name: body.name || 'API Request',
            user_name: body.userName || null,
            client_ip_address: body.ip || null,
            url: body.url || '',
            http_request: body.method || 'GET',
            has_exception: 'false',
            duration: body.duration || null,
            extra_properties: body.extra ? JSON.stringify(body.extra) : null,
        });
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[AuditLog internal] Error:', err?.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
