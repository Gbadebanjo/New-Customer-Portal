import { verifyAuth } from '@/lib/auth/auth';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { NextResponse } from 'next/server';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';

export async function GET(request) {
    const result = await verifyAuth();
    if (!result.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const interval = searchParams.get('interval') || '1h';

    if (!assetId || !dateFrom || !dateTo) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { access_token } = await getAmmpToken(result.user.id);
    if (!access_token) {
        return NextResponse.json({ error: 'Failed to authenticate with AMMP' }, { status: 500 });
    }

    const data = await AmmpServices().getHistoricKpiData(
        access_token, assetId, new Date(dateFrom), new Date(dateTo), interval
    );
    return NextResponse.json(data ?? {});
}
