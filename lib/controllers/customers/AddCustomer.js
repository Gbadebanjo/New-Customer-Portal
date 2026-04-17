'use server'
import { v4 as uuidv4 } from "uuid";
import Customer from "@/database/models/Customer";
import xss from 'xss';
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;

const s3 = new S3Client({
    region: bucketRegion,
    credentials: {
        accessKeyId: process.env.BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.BUCKET_SECRET_KEY,
    },
});

export default async function AddCustomer(formData) {
    console.log('<<<<< INSIDE ADD CUSTOMER N>>>>>');

    try {
        const companyName = xss(formData.get('name'));

        const file = formData.get('image');
        let s3FileName = null;

        const existingCustomer = await Customer.findOne({
            where: { company_name: companyName },
        });
        if (existingCustomer) {
            return { error: "Company name already exists. Please choose another." };
        }

        if (file && file.size > 0) {
            const fileName = xss(file.name);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const type = await fileTypeFromBuffer(buffer);
            const contentType = type ? type.mime : file.type;

            // Generate a unique file name for the S3 object
            s3FileName = `${uuidv4()}-${fileName}`;

            // Upload the image to S3
            const uploadParams = {
                Bucket: bucketName,
                Key: s3FileName,
                Body: buffer,
                ContentType: contentType,
            };

            const command = new PutObjectCommand(uploadParams);
            await s3.send(command);
        } else {
            s3FileName = null;
        }

        const customerData = {
            id: uuidv4(),
            company_name: companyName,
            logo_file_name: s3FileName, // Use the S3 file name if available
            users: [],
        };

        // console.log('customerData', customerData);

        const newCustomer = await Customer.create(customerData);
        // console.log('successfully saved', newCustomer);

        revalidatePath('/customers');
        // redirect('/customers');
    } catch (err) {
        console.error(err);
    }
}
