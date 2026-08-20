'use server';

import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import PowerProductionPlanItem from '@/database/models/PowerProductionPlanitem';
import { v4 as uuidv4 } from "uuid";
import ExcelJS from "exceljs";
import xss from "xss";
import { revalidatePath } from "next/cache";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

// Planned production upload: parse the uploaded workbook in memory
// and insert the per-site monthly totals into `power_production_plan_items`.
// Admin / Portal Admin only — this ingests untrusted spreadsheet data
// into the DB and drives the "Planned vs Actual" chart every customer
// sees, so it must not be reachable by customer users.
export default async function AddPowerProductionPlan(formData) {
  try {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };

    const fileName = xss(formData.get('fileName'));
    const note = xss(formData.get('note'));
    const file = formData.get('file');
    if (!file) throw new Error('File is missing');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const headers = {};
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value);
    });

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      Object.entries(headers).forEach(([colNumber, header]) => {
        rowData[header] = row.getCell(Number(colNumber)).value ?? null;
      });
      rows.push(rowData);
    });

    const planId = uuidv4();
    await PowerProductionPlan.create({
      id: planId,
      file_name: fileName,
      note: note,
    });

    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    const items = [];
    for (const row of rows) {
      const siteId = row["Site code"];
      const year = row["Year"];

      months.forEach((monthName, index) => {
        const expectedValue = row[monthName];
        if (expectedValue != null && siteId && year) {
          items.push({
            id: uuidv4(),
            power_production_plan_id: planId,
            site_id: siteId,
            expected_value: Number(expectedValue),
            month: index + 1,
            year: Number(year),
          });
        }
      });
    }

    if (items.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < items.length; i += batchSize) {
        await PowerProductionPlanItem.bulkCreate(items.slice(i, i + batchSize));
          }
    }
  } catch (error) {
    console.error("AddPowerProductionPlan error:", error);
    throw error;
  }

  revalidatePath('/planned-data-upload');
  return { success: true };
}
