import { NextResponse } from 'next/server';

// Routes to skip logging (noise / internal / static)
const SKIP_PATTERNS = [
    /^\/api\/internal\//,
    /^\/api\/auth\//,
    /^\/_next\//,
    /^\/favicon/,
    /\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/i,
];

// Only log mutating API calls (skip GET — too noisy, log on the server action level instead)
const LOG_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    const shouldLog =
        LOG_METHODS.has(method) &&
        pathname.startsWith('/api/') &&
        !SKIP_PATTERNS.some((p) => p.test(pathname));

    if (shouldLog) {
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        const secret = process.env.INTERNAL_LOG_SECRET;
        if (secret) {
            // Fire-and-forget — don't await so middleware doesn't add latency
            const baseUrl = request.nextUrl.origin;
            fetch(`${baseUrl}/api/internal/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-secret': secret,
                },
                body: JSON.stringify({
                    name: `API ${method}`,
                    url: pathname,
                    method,
                    ip,
                }),
            }).catch(() => { /* non-fatal */ });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*'],
};
