'use server'
import ReportData from '@/database/models/ReportData';
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export default async function saveReportData(siteId, month, year, rows, plannedMonthlyKwh, customerId = '') {
  try {
    for (const row of rows) {
      const where = {
        site_id: siteId,
        report_month: month,
        report_year: year,
        day: row.day,
      };

      const existing = await ReportData.findOne({ where });

      const data = {
        customer_id: customerId,
        site_id: siteId,
        report_month: month,
        report_year: year,
        day: row.day,
        total_daily_consumption: row.total_daily_consumption || 0,
        total_daytime_consumption: row.total_daytime_consumption || 0,
        planned_daytime_consumption: row.planned_daytime_consumption || 0,
        pv_production: row.pv_production || 0,
        planned_pv_production: row.planned_pv_production || 0,
        energy_production_turbine: row.energy_production_turbine || 0,
        energy_production_diesel_generator: row.energy_production_diesel_generator || 0,
        daily_daytime_solar_displacement: row.daily_daytime_solar_displacement || '',
        total_solar_displacement: row.total_solar_displacement || '',
        data_capture_daytime: row.data_capture_daytime || '',
        data_capture_entire_day: row.data_capture_entire_day || '',
        remarks: row.remarks || '',
        planned_monthly_kwh: plannedMonthlyKwh || 0,
      };

      if (existing) {
        await ReportData.update(data, { where });
      } else {
        await ReportData.create({ id: uuidv4(), ...data });
      }
    }

    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error('Error saving report data:', error);
    return { success: false, error: error.message };
  }
}
