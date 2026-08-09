import UsersScreen from "@/components/Users/UsersScreen";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";

export default async function Profile({ params }) {
    const { id: customerId } = await params;
    const { users } = await getAllUsers();
    const customers = await getAllCustomers();

    const filteredUsers = users.filter(user => user.customer === customerId);
    return <UsersScreen users={filteredUsers} customers={customers} />;
}
