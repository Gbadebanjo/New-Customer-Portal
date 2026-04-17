'use server'
import Customer from '@/database/models/Customer';

export default async function AddUserToCustomerUserArray(userId, customerId) {
    try {
        // get Customer by id
        const customer = await Customer.findByPk(customerId);
        // console.log('fetched customer', JSON.stringify(customer));

        const { id, company_name, logo_file_name, users } = customer;

        let newUsersArray = users ? [...users] : [];
        if (!newUsersArray.some(user => user.userId === userId)) {
            newUsersArray.push({ userId });
        }

        // Modify customer user array
        const newCustomerData = {
            id,
            company_name,
            logo_file_name,
            users: newUsersArray,
        };

        // console.log('newCustomerData', JSON.stringify(newCustomerData));

        // Update customer
        const [updatedRowsCount] = await Customer.update(newCustomerData, {
            where: {
                id: customerId
            }
        });
        // console.log('updatedRowsCount saved', updatedRowsCount);
        // console.log('successfully saved newCustomerData with user');

    } catch (err) {
        console.log(err);
    }
}
