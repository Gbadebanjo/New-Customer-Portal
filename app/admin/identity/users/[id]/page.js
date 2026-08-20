import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';
import getUserById from '@/lib/controllers/users/getUserById';
import getCustomerById from '@/lib/controllers/customers/getCustomerById';
import getAllCustomers from '@/lib/controllers/customers/getAllCustomers';
import { getUserActivity, getUserSessions, getUserFailedLoginCount } from '@/lib/controllers/users/getUserActivity';
import UserDetailScreen from '@/components/UserDetail/UserDetailScreen';
import { redirect } from 'next/navigation';

// Roles allowed to write user rows (drives visibility of the Edit
// button on the detail screen). Kept in sync with
// `requireWriteAdminAuth` in lib/auth/requireAdminAuth.js — Admin and
// Portal Admin can edit; DCA is read + impersonate only.
const WRITE_ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

export default async function UserDetailPage({ params }) {
    const { user: callerAuth } = await requireAdminAuth();
    const { id } = await params;

    const [{ user }, { user: callerFull }, allCustomers, activityRes, sessionsRes, failedRes] = await Promise.all([
        getUserById(id),
        getUserById(callerAuth.id),
        getAllCustomers(),
        getUserActivity(id, { limit: 100 }),
        getUserSessions(id),
        getUserFailedLoginCount(id),
    ]);

    if (!user) return redirect('/admin/identity/users');

    const callerRoles = Array.isArray(callerFull?.roles) ? callerFull.roles : [];
    // Delete-user is gated to the top-tier Admin role only — Portal
    // Admin and DCA never see the red button.
    const callerIsAdmin = callerRoles.some((r) => r?.name === 'Admin');
    // Edit-user is gated to Admin + Portal Admin (matches
    // `requireWriteAdminAuth` on updateUserById). DCA doesn't get it.
    const callerCanWrite = callerRoles.some((r) => WRITE_ADMIN_ROLES.has(r?.name));

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
            callerCanWrite={callerCanWrite}
            customers={Array.isArray(allCustomers) ? allCustomers : []}
            activity={activityRes?.ok ? activityRes.events : []}
            sessions={sessionsRes?.ok ? sessionsRes.sessions : []}
            failedLoginCount={failedRes?.ok ? failedRes.count : 0}
            failedLoginWindowDays={failedRes?.ok ? failedRes.windowDays : 30}
        />
    );
}
