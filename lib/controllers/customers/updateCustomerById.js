'use server'
import Customer from '@/database/models/Customer';
import {revalidatePath} from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function updateCustomerById(customerId, newData) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };

    const [updatedRowsCount] = await Customer.update(newData, {
        where: {
            id: customerId
        }
    });
    revalidatePath('/customers')
    return { updatedRowsCount };
}
