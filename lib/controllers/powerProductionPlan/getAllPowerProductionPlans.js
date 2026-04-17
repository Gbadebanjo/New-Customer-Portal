import PowerProductionPlan from '@/database/models/PowerProductionPlan';

export const dynamic = "force dynamic";

export default async function getAllPowerProductionPlan() {
    const powerProductionPlans = await PowerProductionPlan.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return { powerProductionPlans };
}
