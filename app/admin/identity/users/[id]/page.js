import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';
import getUserById from '@/lib/controllers/users/getUserById';
import { getUserActivity, getUserSessions, getUserFailedLoginCount } from '@/lib/controllers/users/getUserActivity';
import UserDetailScreen from '@/components/UserDetail/UserDetailScreen';
import { redirect } from 'next/navigation';

export default async function UserDetailPage({ params }) {
    await requireAdminAuth();
    const { id } = await params;

    const [{ user }, activityRes, sessionsRes, failedRes] = await Promise.all([
        getUserById(id),
        getUserActivity(id, { limit: 100 }),
        getUserSessions(id),
        getUserFailedLoginCount(id),
    ]);

    if (!user) return redirect('/admin/identity/users');

    return (
        <UserDetailScreen
            user={user}
            activity={activityRes?.ok ? activityRes.events : []}
            sessions={sessionsRes?.ok ? sessionsRes.sessions : []}
            failedLoginCount={failedRes?.ok ? failedRes.count : 0}
            failedLoginWindowDays={failedRes?.ok ? failedRes.windowDays : 30}
        />
    );
}
