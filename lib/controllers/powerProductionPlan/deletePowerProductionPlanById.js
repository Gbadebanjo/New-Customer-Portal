'use server'
import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import { revalidatePath } from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function deletePowerProductionPlanById(powerProductionPlanId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };
    if (!powerProductionPlanId) return { error: 'Missing plan id' };

    const deletedPowerProductionPlan = await PowerProductionPlan.destroy({
        where: { id: powerProductionPlanId },
    });
    revalidatePath('/planned-data-upload');
    return { deletedPowerProductionPlan };
}
