import UsersScreen from "@/components/Users/UsersScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";

export default async function UsersPage() {
    await requireAdminAuth();
    const { users } = await getAllUsers();
    const customers = await getAllCustomers();
    return <UsersScreen users={users} customers={customers} />;
}
