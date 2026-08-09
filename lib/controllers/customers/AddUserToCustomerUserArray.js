'use server'
import Customer from '@/database/models/Customer';

export default async function AddUserToCustomerUserArray(userId, customerId) {
    try {
        const customer = await Customer.findByPk(customerId);
        const { id, company_name, logo_file_name, users } = customer;

        let newUsersArray = users ? [...users] : [];
        if (!newUsersArray.some(user => user.userId === userId)) {
            newUsersArray.push({ userId });
        }

        const newCustomerData = {
            id,
            company_name,
            logo_file_name,
            users: newUsersArray,
        };

        await Customer.update(newCustomerData, {
            where: { id: customerId }
        });
    } catch (err) {
        console.error('AddUserToCustomerUserArray failed:', err);
    }
}
