import PowerProductionPlanItem from '@/database/models/PowerProductionPlanitem';

export default async function getPowerProductionPlanItemById(powerProductionPlanItemId) {
    const powerProductionPlanItem = await PowerProductionPlanItem.findByPk(powerProductionPlanItemId, { raw: true });
    return { powerProductionPlanItem };
}
