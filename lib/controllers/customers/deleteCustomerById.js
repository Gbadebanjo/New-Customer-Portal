'use server'
import models from "@/database/models";
import {revalidatePath} from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function deleteCustomerById(customerId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };

    const deletedCustomer = await models.Customer.destroy({
        where: {
            id: customerId
        }
    });
    revalidatePath('/customers')
    return { deletedCustomer };
}
