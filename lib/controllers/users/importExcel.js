'use server';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { revalidatePath } from 'next/cache';
import AddUserToCustomerUserArray from '@/lib/controllers/customers/AddUserToCustomerUserArray';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import db from '@/database/models';

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;

const s3 = new S3Client({
    region: bucketRegion,
});

export default async function importExcel(formData) {
    try {
        const file = formData.get('file');
        if (!file) {
            return { error: 'File is missing' };
        }

        const fileName = xss(file.name);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const type = await fileTypeFromBuffer(buffer);
        const contentType = type ? type.mime : file.type;

        const s3FileName = `${uuidv4()}-${fileName}`;

        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3FileName,
            Body: buffer,
            ContentType: contentType,
        }));

        const fileExtension = fileName.split('.').pop().toLowerCase();
        const workbook = new ExcelJS.Workbook();

        if (fileExtension === 'csv') {
            const stream = Readable.from(buffer);
            await workbook.csv.read(stream);
        } else if (fileExtension === 'xlsx') {
            await workbook.xlsx.load(buffer);
        } else {
            return { error: 'Unsupported file format. Please upload a CSV or XLSX file.' };
        }

        const sheet = workbook.worksheets[0];

        const headers = {};
        sheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value);
        });

        const users = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const user = {};
            Object.entries(headers).forEach(([colNumber, header]) => {
                user[header] = row.getCell(Number(colNumber)).value ?? null;
            });
            users.push(user);
        });

        for (const user of users) {
            const userData = {
                id: uuidv4(),
                username: xss(user.UserName),
                email: xss(user.Email),
                phone_number: xss(user.Phone),
                name: xss(user.Name).toUpperCase(),
                surname: xss(user.Surname).toUpperCase(),
                ammp_api_key: xss(user.AMMP_API_key),
                customer: xss(user.SelectedCustomer),
                roles: JSON.parse(user.roles),
                timezone: xss(user.Timezone),
                is_locked_out: false,
                not_active: false,
                email_confirmed: false,
                is_external: false,
                creation_time: new Date(),
                modification_time: new Date(),
            };

            const newUser = await db.User.create(userData);
            await AddUserToCustomerUserArray(newUser.id, userData.customer);
        }

        revalidatePath('/admin/identity/users');
        return { success: true };
    } catch (error) {
        console.error('importExcel error:', error);
        return { error: 'Failed to import users. Please try again.' };
    }
}
