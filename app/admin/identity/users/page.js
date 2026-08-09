import UsersScreen from "@/components/Users/UsersScreen";
import { requireAdminAuth, currentUserCanWrite } from "@/lib/auth/requireAdminAuth";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";

export default async function UsersPage() {
    await requireAdminAuth();
    const [{ users }, customers, canWrite] = await Promise.all([
        getAllUsers(),
        getAllCustomers(),
        currentUserCanWrite(),
    ]);
    return <UsersScreen users={users} customers={customers} canWrite={canWrite} />;
}
