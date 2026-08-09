import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { lookupApiKey } from '@/lib/services/publicApi/apiKeys';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/report-data
 *
 * Public read-only endpoint that returns daily report rows. Authenticated
 * via `x-daystar-api-key` header. Keys are managed on /admin/api-keys.
 *
 * Query parameters:
 *   from        YYYY-MM-DD  required, inclusive
 *   to          YYYY-MM-DD  required, inclusive
 *   siteIds     comma-list  optional, filters to specific sites
 *   customerId  string      optional, only honoured for fleet-scoped keys
 *   status      'verified' (default) | 'raw' | 'all'
 *
 * Scope:
 *   - Customer-scoped keys always return only their own customer's rows —
 *     any customerId query param is ignored.
 *   - Fleet-scoped keys return rows across all customers by default; pass
 *     `customerId` to filter.
 */
export async function GET(request) {
    const key = request.headers.get('x-daystar-api-key');
    const auth = await lookupApiKey(key);
    if (!auth) {
        return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const sitesParam = url.searchParams.get('siteIds');
    const status = (url.searchParams.get('status') || 'verified').toLowerCase();
    const requestedCustomer = url.searchParams.get('customerId');

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing required parameters: from, to (YYYY-MM-DD)' }, { status: 400 });
    }

    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T23:59:59Z`);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (fromDate > toDate) {
        return NextResponse.json({ error: 'from must be ≤ to' }, { status: 400 });
    }
    const MAX_DAYS = 366;
    if ((toDate - fromDate) / (24 * 60 * 60 * 1000) > MAX_DAYS) {
        return NextResponse.json({ error: `Range exceeds ${MAX_DAYS} days` }, { status: 400 });
    }

    // Scope enforcement — customer keys are locked to their own customer id,
    // fleet keys may filter or return everything.
    const where = {};
    if (auth.scope === 'customer') {
        where.customer_id = auth.customerId;
    } else if (requestedCustomer) {
        where.customer_id = requestedCustomer;
    }

    if (status === 'verified') where.status = 'verified';
    else if (status === 'raw') where.status = 'raw';

    // Month-level pre-filter — see resolver for the same trick.
    const monthClauses = [];
    const seen = new Set();
    for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 24 * 60 * 60 * 1000) {
        const d = new Date(t);
        const k = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
        if (seen.has(k)) continue;
        seen.add(k);
        monthClauses.push({ report_year: d.getUTCFullYear(), report_month: d.getUTCMonth() + 1 });
    }
    if (monthClauses.length > 0) where[Op.or] = monthClauses;

    if (sitesParam) {
        const siteIds = sitesParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (siteIds.length > 0) where.site_id = { [Op.in]: siteIds };
    }

    const rows = await db.ReportData.findAll({
        where,
        order: [['report_year', 'ASC'], ['report_month', 'ASC'], ['day', 'ASC']],
        raw: true,
    });

    const shaped = rows
        .filter((r) => {
            const d = new Date(Date.UTC(r.report_year, r.report_month - 1, r.day));
            return d >= fromDate && d <= toDate;
        })
        .map((r) => ({
            date: `${r.report_year}-${String(r.report_month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`,
            siteId: r.site_id,
            customerId: r.customer_id || null,
            solarKwh: Number(r.pv_production ?? 0),
            consumptionKwh: Number(r.total_daily_consumption ?? 0),
            generatorKwh: Number(r.energy_production_diesel_generator ?? 0),
            status: r.status,
            verifiedAt: r.verified_at,
        }));

    return NextResponse.json({
        scope: auth.scope,
        customerId: auth.scope === 'customer' ? auth.customerId : (requestedCustomer || null),
        window: { from, to },
        rows: shaped,
        count: shaped.length,
    });
}
