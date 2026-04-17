'use server'
import PowerProductionPlanItem from '@/database/models/PowerProductionPlanItem';

export default async function addPowerProductionPlanItem(powerProductionPlanItemData) {
    try{
        const newPowerProductionPlanItem = await PowerProductionPlanItem.create(powerProductionPlanItemData);
        return { powerProductionPlanItem: newPowerProductionPlanItem };
    }catch(error){
        console.log(error);
    }
}
