import PowerProductionPlanItem from '@/database/models/PowerProductionPlanItem';

export default async function deletePowerProductionPlanItemById(powerProductionPlanItemId) {
    const deletedPowerProductionPlanItem = await PowerProductionPlanItem.destroy({
        where: {
            id: powerProductionPlanItemId
        }
    });
    return { deletedPowerProductionPlanItem };
}
