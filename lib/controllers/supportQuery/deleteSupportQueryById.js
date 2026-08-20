'use server'
import SupportQuery from '@/database/models/SupportQuery';
import { revalidatePath } from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

// Ticket destroy is Admin / Portal Admin only. Customer users
// resolve tickets instead of deleting them, and DCA is read + assist.
export default async function deleteSupportQueryById(supportQueryId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };
    if (!supportQueryId) return { error: 'Missing ticket id' };

    const deletedSupportQuery = await SupportQuery.destroy({
        where: { id: supportQueryId },
    });
    revalidatePath('/support');
    return { deletedSupportQuery };
}
