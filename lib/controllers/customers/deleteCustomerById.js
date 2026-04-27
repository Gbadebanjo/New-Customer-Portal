'use server'
import models from "@/database/models";
import {revalidatePath} from "next/cache";

export default async function deleteCustomerById(customerId) {
    const deletedCustomer = await models.Customer.destroy({
        where: {
            id: customerId
        }
    });
    revalidatePath('/customers')
    return { deletedCustomer };
}
