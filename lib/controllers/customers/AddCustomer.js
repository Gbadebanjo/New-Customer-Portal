'use server'
import { v4 as uuidv4 } from "uuid";
import Customer from "@/database/models/Customer";
import xss from 'xss';
import { revalidatePath } from "next/cache";
import listUnclaimedAmmpCustomers from "@/lib/controllers/customers/listUnclaimedAmmpCustomers";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function AddCustomer(formData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

        const companyName = xss(formData.get('name'));

        const existingCustomer = await Customer.findOne({
            where: { company_name: companyName },
        });
        if (existingCustomer) {
            return { error: "Company name already exists. Please choose another." };
        }

        // Every customer must map 1:1 to an AMMP customer group.
        const { customers: allowed, error: listErr } = await listUnclaimedAmmpCustomers();
        if (listErr) {
            return { error: `Could not verify against data provider: ${listErr}` };
        }
        const isValid = allowed.some(
            (n) => n.trim().toLowerCase() === companyName.trim().toLowerCase()
        );
        if (!isValid) {
            return { error: "This company is not available on the data provider. Please pick one from the list." };
        }

        await Customer.create({
            id: uuidv4(),
            company_name: companyName,
            logo_file_name: null,
            users: [],
        });

        revalidatePath('/customers');
    } catch (err) {
        console.error(err);
        return { error: err.message || "Failed to create customer" };
    }
}
