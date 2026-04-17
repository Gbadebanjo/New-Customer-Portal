'use server';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import AddUserToCustomerUserArray from '@/lib/controllers/customers/AddUserToCustomerUserArray';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
// import User from '@/database/models/User';
import db from '@/database/models';

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;

const s3 = new S3Client({
    region: bucketRegion,
});

export default async function importExcel(formData) {
    console.log('<<<<< INSIDE IMPORT EXCEL >>>>>');
    console.log('<<<<< INSIDE 2  >>>>>');
    try {
        const file = formData.get('file');
        if (!file) {
            throw new Error('File is missing');
        }

        const fileName = xss(file.name);
        console.log('<<<<< fileName  >>>>>', fileName);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const type = await fileTypeFromBuffer(buffer);
        const contentType = type ? type.mime : file.type;

        // Generate a unique file name for the S3 object
        const s3FileName = `${uuidv4()}-${fileName}`;
        console.log('<<<<< s3FileName  >>>>>', s3FileName);

        // Upload the file to S3
        const uploadParams = {
            Bucket: bucketName,
            Key: s3FileName,
            Body: buffer,
            ContentType: contentType,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3.send(command);

        // Process the file data
        let users = [];

        const fileExtension = fileName.split('.').pop();
        if (fileExtension === 'csv') {
            const fileContent = buffer.toString('utf8');
            const parsedCsv = xlsx.read(fileContent, { type: 'string' });
            users = xlsx.utils.sheet_to_json(parsedCsv.Sheets[parsedCsv.SheetNames[0]]);
        } else if (fileExtension === 'xlsx') {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            users = xlsx.utils.sheet_to_json(worksheet);
        } else {
            throw new Error('Unsupported file format');
        }

        // Loop through each user and add them to the database
        for (const user of users) {
            const userName = xss(user.UserName);
            const surName = xss(user.Surname);
            const name = xss(user.Name);
            const email = xss(user.Email);
            const phone = xss(user.Phone);
            const timezone = xss(user.Timezone);
            const ammpApiKey = xss(user.AMMP_API_key);
            const selectedCustomer = xss(user.SelectedCustomer);
            const roles = JSON.parse(user.roles);

            const userData = {
                id: uuidv4(),
                username: userName,
                email: email,
                phone_number: phone,
                name: name.toUpperCase(),
                surname: surName.toUpperCase(),
                ammp_api_key: ammpApiKey,
                customer: selectedCustomer,
                roles: roles,
                timezone: timezone,
                is_locked_out: false,
                not_active: false,
                email_confirmed: false,
                is_external: false,
                creation_time: new Date(),
                modification_time: new Date(),
            };

            console.log('userData', userData);

            const newUser = await db.User.create(userData);
            console.log('Successfully saved', newUser);

            const { id } = newUser;
            console.log('new user Id', id);
            console.log('selectedCustomer', selectedCustomer);

            await AddUserToCustomerUserArray(id, selectedCustomer);
        }

    } catch (error) {
        console.log(error);
    }

    revalidatePath('/admin/identity/users');
    redirect('/admin/identity/users');
}
