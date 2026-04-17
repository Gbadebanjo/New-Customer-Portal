'use server'
import Report from '@/database/models/Report';
import {v4 as uuidv4} from "uuid";
import xss from "xss";
import {redirect} from "next/navigation";
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
    console.log('<<<<< INSIDE ADD REPORT N>>>>>');
    try {
        const name = xss(formData.get('name'));
        const file_name = xss(formData.get('file')['name']);
        const file = formData.get('file');
        console.log('<<<<< BEFORE File>>>>>');
        if (!file) {
            throw new Error('Image file is missing');
        }
        console.log('File:', file);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const type = await fileTypeFromBuffer(buffer);
        const contentType = type ? type.mime : file.type;

        // Generate a unique file name for the S3 object
        const s3FileName = `${uuidv4()}-${file_name}`;

        // Upload the image to S3
        const uploadParams = {
            Bucket: bucketName,
            Key: s3FileName,
            Body: buffer,
            ContentType: contentType,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3.send(command);

        const reportData = {
            id: uuidv4(),
            name: name.toUpperCase(),
            site_id: 'demo site',
            concurrency_stamp: 'demo stamp',
            file_name: file_name.toUpperCase(),
        }

        console.log('reportData', reportData);

        const newReport = await Report.create(reportData);
        console.log('successfully saved', newReport);


    } catch (error) {
        console.log(error)
    }
    revalidatePath('/reports')
    redirect('/reports')
}
