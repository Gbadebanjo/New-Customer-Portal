import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import getUserById from '@/lib/controllers/users/getUserById';

export async function GET() {
    try {
        const { user: sessionUser } = await verifyAuth();
        if (!sessionUser) {
            return NextResponse.json(null, { status: 401 });
        }
        const { user } = await getUserById(sessionUser.id);
        if (!user) {
            return NextResponse.json(null, { status: 404 });
        }
        // Only send what the client needs — never expose password hash
        const { id, username, email, name, surname, roles, customer, timezone } = user;
        return NextResponse.json({ id, username, email, name, surname, roles, customer, timezone });
    } catch {
        return NextResponse.json(null, { status: 500 });
    }
}
