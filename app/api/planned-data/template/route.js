import * as XLSX from 'xlsx';

export async function GET() {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Two example rows to show the expected format
    const exampleRows = [
        {
            'Site code': 'SITE-001',
            'Year': 2025,
            ...Object.fromEntries(months.map(m => [m, 0])),
        },
        {
            'Site code': 'SITE-002',
            'Year': 2025,
            ...Object.fromEntries(months.map(m => [m, 0])),
        },
    ];

    const ws = XLSX.utils.json_to_sheet(exampleRows, {
        header: ['Site code', 'Year', ...months],
    });

    // Set column widths
    ws['!cols'] = [
        { wch: 15 },  // Site code
        { wch: 8 },   // Year
        ...months.map(() => ({ wch: 12 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planned Data');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="planned_data_template.xlsx"',
        },
    });
}
