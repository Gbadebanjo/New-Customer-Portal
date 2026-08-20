'use server'
import Customer from '@/database/models/Customer';

export default async function AddUserToCustomerUserArray(userId, customerId) {
    try {
        const customer = await Customer.findByPk(customerId);
        if (!customer) return;
        const { users } = customer;

        let newUsersArray = users ? [...users] : [];
        if (!newUsersArray.some(user => user.userId === userId)) {
            newUsersArray.push({ userId });
        }

        await Customer.update({ users: newUsersArray }, {
            where: { id: customerId },
        });
    } catch (err) {
        console.error('AddUserToCustomerUserArray failed:', err);
    }
}
