import UsersScreen from "@/components/Users/UsersScreen";
import { requireAdminAuth, currentUserCanWrite } from "@/lib/auth/requireAdminAuth";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";
import getUserById from "@/lib/controllers/users/getUserById";

export default async function UsersPage() {
    const { user: callerAuth } = await requireAdminAuth();
    const [{ users }, customers, canWrite, { user: callerFull }] = await Promise.all([
        getAllUsers(),
        getAllCustomers(),
        currentUserCanWrite(),
        getUserById(callerAuth.id),
    ]);
    // Only top-tier Admin may assign Admin / Portal Admin — used to
    // lock those role radios in the create-user modal. Server enforces
    // the same rule in AddUser.js.
    const callerIsAdmin = Array.isArray(callerFull?.roles)
        && callerFull.roles.some((r) => r?.name === 'Admin');
    return <UsersScreen users={users} customers={customers} canWrite={canWrite} callerIsAdmin={callerIsAdmin} />;
}
