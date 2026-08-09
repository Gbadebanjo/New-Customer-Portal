import PowerProductionPlanItem from '@/database/models/PowerProductionPlanitem';

export default async function deletePowerProductionPlanItemById(powerProductionPlanItemId) {
    const deletedPowerProductionPlanItem = await PowerProductionPlanItem.destroy({
        where: {
            id: powerProductionPlanItemId
        }
    });
    return { deletedPowerProductionPlanItem };
}
