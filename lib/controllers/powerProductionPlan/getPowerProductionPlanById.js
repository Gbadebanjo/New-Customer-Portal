'use server'
import PowerProductionPlan from '@/database/models/PowerProductionPlan';

export default async function getPowerProductionPlanById(powerProductionPlanId) {
    const powerProductionPlan = await PowerProductionPlan.findByPk(powerProductionPlanId, { raw: true });
    return { powerProductionPlan };
}

