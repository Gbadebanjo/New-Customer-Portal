'use server'
import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import {revalidatePath} from "next/cache";

export default async function deletePowerProductionPlanById(powerProductionPlanId) {
    const deletedPowerProductionPlan = await PowerProductionPlan.destroy({
        where: {
            id: powerProductionPlanId
        }
    });
    revalidatePath('/planned-data-upload')
    return { deletedPowerProductionPlan };
}
