'use server'
import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import { revalidatePath } from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

// Only these display-metadata fields are editable via this action —
// nothing else on the plan row should be reachable from the client.
// Whitelist closes the mass-assignment path where arbitrary columns
// (creator_id, timestamps, etc.) could be overwritten.
const ALLOWED_FIELDS = ['file_name', 'note'];

export default async function updatePowerProductionPlanById(powerProductionPlanId, newData) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };
    if (!powerProductionPlanId) return { error: 'Missing plan id' };

    const clean = {};
    for (const key of ALLOWED_FIELDS) {
        if (newData && Object.prototype.hasOwnProperty.call(newData, key)) {
            clean[key] = newData[key];
        }
    }

    const updatedPowerProductionPlan = await PowerProductionPlan.update(clean, {
        where: { id: powerProductionPlanId },
    });
    revalidatePath('/planned-data-upload');
    return { updatedPowerProductionPlan };
}
