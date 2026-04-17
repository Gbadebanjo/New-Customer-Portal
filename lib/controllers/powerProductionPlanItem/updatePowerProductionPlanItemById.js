import PowerProductionPlanItem from '@/database/models/PowerProductionPlanItem';

export default async function updatePowerProductionPlanItemById(powerProductionPlanItemId, newData) {
    const updatedPowerProductionPlanItem = await PowerProductionPlanItem.update(newData, {
        where: {
            id: powerProductionPlanItemId
        }
    });
    return { updatedPowerProductionPlanItem };
}
