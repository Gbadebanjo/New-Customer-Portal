'use server'
import PowerProductionPlanItem from '@/database/models/PowerProductionPlanitem';

export default async function addPowerProductionPlanItem(powerProductionPlanItemData) {
    try{
        const newPowerProductionPlanItem = await PowerProductionPlanItem.create(powerProductionPlanItemData);
        return { powerProductionPlanItem: newPowerProductionPlanItem };
    }catch(error){
        console.log(error);
    }
}
