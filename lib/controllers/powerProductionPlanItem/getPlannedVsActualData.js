'use server';

import models from "@/database/models";
import { Op } from "sequelize";

export default async function getPlannedVsActualData(siteId, dateFrom, dateTo) {
    try {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        const fromYear = fromDate.getFullYear();
        const fromMonth = fromDate.getMonth() + 1; // Months are zero-based
        const toYear = toDate.getFullYear();
        const toMonth = toDate.getMonth() + 1;
        // console.log('fromYear:', fromYear, 'fromMonth:', fromMonth, 'toYear:', toYear, 'toMonth:', toMonth);

        const items = await models.PowerProductionPlanItem.findAll({
            where: {
                site_id: siteId,
                [Op.or]: [
                    {
                        year:  fromYear, 
                        month: { [Op.gte]: fromMonth }
                    },
                    {
                        year: toYear, 
                        month: { [Op.lte]: toMonth }
                    },
                    {
                        year: { [Op.between]: [fromYear + 1, toYear - 1] }
                    }
                ]
            },
            order: [['year', 'ASC'], ['month', 'ASC']]
        });

        // console.log('Planned Items:', items);
        return JSON.parse(JSON.stringify(items));
    } catch (error) {
        console.error("getPlannedVsActualData error:", error);
        throw error;
    }
}

