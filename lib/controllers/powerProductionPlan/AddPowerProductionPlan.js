'use server';

import PowerProductionPlan from '@/database/models/PowerProductionPlan';
import PowerProductionPlanItem from '@/database/models/PowerProductionPlanitem';
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import xss from "xss";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import dotenv from 'dotenv';

dotenv.config();

// --- Configure S3 client with credentials ---
const s3 = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.BUCKET_SECRET_KEY,
  },
});

export default async function AddPowerProductionPlan(formData) {
  try {
    // console.log('<<<<< INSIDE ADD PLANNED PROD PLAN >>>>>');

    const fileName = xss(formData.get('fileName'));
    const note = xss(formData.get('note'));
    const file = formData.get('file');
    if (!file) throw new Error('File is missing');

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload raw file to S3
    const type = await fileTypeFromBuffer(buffer);
    const contentType = type ? type.mime : file.type;
    const s3FileName = `${uuidv4()}-${file.name}`;

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: s3FileName,
      Body: buffer,
      ContentType: contentType,
    };
    await s3.send(new PutObjectCommand(uploadParams));

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Create parent plan
    const planId = uuidv4();
    await PowerProductionPlan.create({
      id: planId,
      file_name: fileName,
      note: note,
      unique_file_name: s3FileName,
    });

    // Month mapping
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    // Insert plan items
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
      const batchSize = 1000; // safe chunk size
      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        await PowerProductionPlanItem.bulkCreate(chunk);
        console.log(`Inserted batch ${i / batchSize + 1}`);
      }
    }
  } catch (error) {
    console.error("AddPowerProductionPlan error:", error);
    throw error;
  }
  

  // Revalidate and redirect
  revalidatePath('/planned-data-upload');
  redirect('/planned-data-upload');
}
