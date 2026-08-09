import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import getUserById from '@/lib/controllers/users/getUserById';

export async function GET() {
    try {
        const { user: sessionUser } = await verifyAuth();
        if (!sessionUser) {
            return NextResponse.json({ user: null });
        }
        const { user } = await getUserById(sessionUser.id);
        if (!user) {
            // Session cookie is valid but the user row has been deleted —
            // treat it as logged-out rather than 404, since the client
            // just wants the current identity.
            return NextResponse.json({ user: null });
        }
        // Only send what the client needs — never expose the password hash.
        const { id, username, email, name, surname, roles, customer, timezone, totp_enabled } = user;
        return NextResponse.json({
            user: { id, username, email, name, surname, roles, customer, timezone, totp_enabled },
        });
    } catch {
        return NextResponse.json({ user: null, error: 'server_error' }, { status: 500 });
    }
}
