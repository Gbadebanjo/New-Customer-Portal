'use server'
import db from '@/database/models';
import { ServiceConstants } from '@/utils/constants';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';

// Return AMMP customer-group names (with the `[Customer] ` prefix
// stripped) that don't yet have a matching local Customer row. Used by
// the New Customer modal to prevent typo'd or duplicate customers —
// every locally-created customer maps 1:1 to an AMMP group.
export default async function listUnclaimedAmmpCustomers() {
  try {
    const { access_token } = await getAmmpToken();
    if (!access_token) {
      return { customers: [], error: 'Data provider is not configured' };
    }

    const res = await fetch(`${ServiceConstants.AmmpServerBaseUrl}/v1/asset_groups`, {
      cache: 'no-store',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const groups = await res.json();
    if (!Array.isArray(groups)) {
      return { customers: [], error: 'Unexpected response from data provider' };
    }

    const CUSTOMER_PREFIX = /^\[customer\]\s+/i;
    const ammpNames = groups
      .map((g) => (g?.group_name || g?.name || '').trim())
      .filter((n) => CUSTOMER_PREFIX.test(n))
      .map((n) => n.replace(CUSTOMER_PREFIX, '').trim())
      .filter(Boolean);

    const existing = await db.Customer.findAll({
      attributes: ['company_name'],
      raw: true,
    });
    const taken = new Set(existing.map((c) => (c.company_name || '').trim().toLowerCase()));

    const unclaimed = Array.from(new Set(ammpNames))
      .filter((n) => !taken.has(n.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    return { customers: unclaimed, error: null };
  } catch (error) {
    console.error('listUnclaimedAmmpCustomers error:', error);
    return { customers: [], error: error.message };
  }
}
