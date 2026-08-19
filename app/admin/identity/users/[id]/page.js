import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';
import getUserById from '@/lib/controllers/users/getUserById';
import getCustomerById from '@/lib/controllers/customers/getCustomerById';
import { getUserActivity, getUserSessions, getUserFailedLoginCount } from '@/lib/controllers/users/getUserActivity';
import UserDetailScreen from '@/components/UserDetail/UserDetailScreen';
import { redirect } from 'next/navigation';

export default async function UserDetailPage({ params }) {
    const { user: callerAuth } = await requireAdminAuth();
    const { id } = await params;

    const [{ user }, { user: callerFull }, activityRes, sessionsRes, failedRes] = await Promise.all([
        getUserById(id),
        getUserById(callerAuth.id),
        getUserActivity(id, { limit: 100 }),
        getUserSessions(id),
        getUserFailedLoginCount(id),
    ]);

    if (!user) return redirect('/admin/identity/users');

    // Delete-user is gated to the top-tier Admin role only — Portal
    // Admin and DCA never see the red button.
    const callerRoles = Array.isArray(callerFull?.roles) ? callerFull.roles : [];
    const callerIsAdmin = callerRoles.some((r) => r?.name === 'Admin');

    // Resolve the customer's display name so the screen can show it
    // instead of the raw UUID. Only fetch when there's actually a
    // customer to look up — Daystar-role users don't have one.
    let customerName = null;
    if (user.customer) {
        try {
            const res = await getCustomerById(user.customer);
            customerName = res?.customer?.company_name || null;
        } catch { /* leave null — the screen falls back to '—' */ }
    }

    return (
        <UserDetailScreen
            user={user}
            customerName={customerName}
            callerIsAdmin={callerIsAdmin}
            activity={activityRes?.ok ? activityRes.events : []}
            sessions={sessionsRes?.ok ? sessionsRes.sessions : []}
            failedLoginCount={failedRes?.ok ? failedRes.count : 0}
            failedLoginWindowDays={failedRes?.ok ? failedRes.windowDays : 30}
        />
    );
}
