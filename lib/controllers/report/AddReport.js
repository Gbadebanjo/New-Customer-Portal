'use server'
import Report from '@/database/models/Report';
import {v4 as uuidv4} from "uuid";
import xss from "xss";
import {revalidatePath} from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;

const s3 = new S3Client({
    region: bucketRegion,
});

export default async function AddReport(formData) {
    try {
        const name = xss(formData.get('name'));
        const file_name = xss(formData.get('file')['name']);
        const file = formData.get('file');

        if (!file) {
            return { error: 'File is missing' };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const type = await fileTypeFromBuffer(buffer);
        const contentType = type ? type.mime : file.type;

        const s3FileName = `${uuidv4()}-${file_name}`;

        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3FileName,
            Body: buffer,
            ContentType: contentType,
        }));

        const reportData = {
            id: uuidv4(),
            name: name.toUpperCase(),
            site_id: 'demo site',
            concurrency_stamp: 'demo stamp',
            file_name: file_name.toUpperCase(),
        };

        await Report.create(reportData);

        revalidatePath('/reports');
        return { success: true };
    } catch (error) {
        console.error('AddReport error:', error);
        return { error: 'Failed to create report. Please try again.' };
    }
}
