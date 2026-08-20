'use server';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import AddUserToCustomerUserArray from '@/lib/controllers/customers/AddUserToCustomerUserArray';
import { sanitizeTimezone } from '@/lib/utils/timezone';
import db from '@/database/models';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';

// User import: parse a CSV / XLSX in memory and insert the rows into
// `users`. The raw file used to be stashed in S3 as an audit trail —
// no downstream ever read it, so the storage was pure waste and the
// AWS SDK dependency was carrying weight for nothing. The parsed rows
// in the DB are the only artifact anyone actually needs.
export default async function importExcel(formData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

        const file = formData.get('file');
        if (!file) {
            return { error: 'File is missing' };
        }

        const fileName = xss(file.name);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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
                customer: xss(user.SelectedCustomer),
                roles: JSON.parse(user.roles),
                timezone: sanitizeTimezone(xss(user.Timezone)),
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
