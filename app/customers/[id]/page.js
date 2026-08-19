import UsersScreen from "@/components/Users/UsersScreen";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
import { requireAdminAuth, currentUserCanWrite } from "@/lib/auth/requireAdminAuth";

// Fields the client needs. Deliberately excludes `password`,
// `totp_secret`, and `totp_temp_secret` — the model exposes them via
// `raw: true`, but they must never be serialised to the browser.
const SAFE_USER_FIELDS = [
    'id', 'username', 'email', 'phone_number',
    'name', 'surname', 'customer', 'roles', 'timezone',
    'is_locked_out', 'not_active', 'email_confirmed', 'is_external',
    'creation_time', 'modification_time', 'totp_enabled',
    'failed_login_attempts', 'lockout_until', 'lockout_started_at',
    'last_failed_login_at', 'created_at', 'updated_at',
];

function projectUser(u) {
    const out = {};
    for (const key of SAFE_USER_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(u, key)) out[key] = u[key];
    }
    return out;
}

export default async function Profile({ params }) {
    // Admin gate — redirects if not signed in / not an admin role. DCA
    // is allowed in (read + impersonate). requireAdminAuth already
    // handles both cases.
    await requireAdminAuth();

    const { id: customerId } = await params;
    const [{ users }, customers, canWrite] = await Promise.all([
        getAllUsers(),
        getAllCustomers(),
        // Only Admin / Portal Admin returns true. DCA returns false, so
        // UsersScreen hides the "New user" + "Import / Export" buttons.
        currentUserCanWrite(),
    ]);

    const filteredUsers = users
        .filter((user) => user.customer === customerId)
        .map(projectUser);

    return <UsersScreen users={filteredUsers} customers={customers} canWrite={canWrite} />;
}
