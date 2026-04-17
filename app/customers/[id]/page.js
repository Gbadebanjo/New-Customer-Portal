// import UsersScreen from "@/components/Users/UsersScreen";
import UsersScreen from "@/components/Users/UsersScreen";
import getAllUsers from "@/lib/controllers/users/getAllUsers";
import getAllCustomers from "@/lib/controllers/customers/getAllCustomers";


export default async function Profile({ params }) {

    const customerId = params.id;
    const { users } = await getAllUsers();
    const customers = await getAllCustomers();

    const filteredUsers = users.filter(user => user.customer === customerId);
    // console.log(filteredUsers, 'Filtered Users for Customer ID:', customerId);
    return <UsersScreen users={filteredUsers} customers={customers} />;
}
