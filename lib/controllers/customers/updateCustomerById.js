'use server'
import Customer from '@/database/models/Customer';
import {revalidatePath} from "next/cache";

export default async function updateCustomerById(customerId, newData) {
    const [updatedRowsCount] = await Customer.update(newData, {
        where: {
            id: customerId
        }
    });
    revalidatePath('/customers')
    return { updatedRowsCount };
}
