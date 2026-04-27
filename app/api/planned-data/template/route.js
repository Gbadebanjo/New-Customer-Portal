import ExcelJS from 'exceljs';
import { verifyAuth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const { user } = await verifyAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Planned Data');

    sheet.columns = [
        { header: 'Site code', key: 'site_code', width: 15 },
        { header: 'Year', key: 'year', width: 8 },
        ...months.map(m => ({ header: m, key: m, width: 12 })),
    ];

    const monthDefaults = Object.fromEntries(months.map(m => [m, 0]));
    sheet.addRow({ site_code: 'SITE-001', year: 2025, ...monthDefaults });
    sheet.addRow({ site_code: 'SITE-002', year: 2025, ...monthDefaults });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="planned_data_template.xlsx"',
        },
    });
}
