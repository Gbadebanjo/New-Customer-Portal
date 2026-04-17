import { NextResponse } from 'next/server';
import SecurityLogs from '@/database/models/SecurityLog';
import { Op } from 'sequelize';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await requireAdminAuth();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const action = searchParams.get('action') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const where = {};

    if (q) {
        where[Op.or] = [
            { user_name: { [Op.iLike]: `%${q}%` } },
            { user_id: { [Op.iLike]: `%${q}%` } },
            { client_ip_address: { [Op.iLike]: `%${q}%` } },
            { browser_info: { [Op.iLike]: `%${q}%` } },
            { correlation_id: { [Op.iLike]: `%${q}%` } },
            { application_name: { [Op.iLike]: `%${q}%` } },
        ];
    }

    if (action) {
        where.action = { [Op.iLike]: `%${action}%` };
    }

    if (dateFrom) {
        where.created_at = { ...where.created_at, [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.created_at = { ...where.created_at, [Op.lte]: to };
    }

    const { count, rows } = await SecurityLogs.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        raw: true,
    });

    return NextResponse.json({ data: rows, total: count, page, limit });
}
