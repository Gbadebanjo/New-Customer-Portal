'use server'
import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import {revalidatePath} from "next/cache";

export default async function updatePowerProductionPlanById(powerProductionPlanId, newData) {
    const updatedPowerProductionPlan = await PowerProductionPlan.update(newData, {
        where: {
            id: powerProductionPlanId
        }
    });
    revalidatePath('/planned-data-upload')
    return { updatedPowerProductionPlan };
}
