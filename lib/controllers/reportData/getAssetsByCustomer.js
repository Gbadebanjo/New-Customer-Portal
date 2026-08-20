'use server'
import db from '@/database/models';
import { ServiceConstants } from '@/utils/constants';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { verifyAuth } from '@/lib/auth/auth';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Under master-key auth there are no per-user AMMP keys, so a customer's
// sites are resolved by matching AMMP's `asset_groups` on the convention
// `[Customer] <company_name>` (case-insensitive). If no matching group
// exists the picker returns an empty list rather than leaking the fleet.
//
// Gated: Customer users can only look up their own customer; Daystar
// roles (NOC + admins) can look up any customer.
export default async function getAssetsByCustomer(customerId) {
  try {
    const { user } = await verifyAuth();
    if (!user?.id) return { assets: [], error: null };
    if (!customerId) {
      return { assets: [], error: null };
    }

    const caller = await db.User.findByPk(user.id, {
      attributes: ['id', 'roles', 'customer'],
      raw: true,
    });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    if (!isDaystar && String(caller?.customer) !== String(customerId)) {
      return { assets: [], error: null };
    }

    const customer = await db.Customer.findOne({
      where: { id: customerId },
      attributes: ['id', 'company_name'],
      raw: true,
    });
    if (!customer) {
      return { assets: [], error: 'Customer not found' };
    }

    const { access_token } = await getAmmpToken();
    if (!access_token) {
      return { assets: [], error: 'Data provider is not configured' };
    }

    const baseUrl = ServiceConstants.AmmpServerBaseUrl;
    const authHeaders = {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const groupsRes = await fetch(`${baseUrl}/v1/asset_groups`, {
      cache: 'no-store',
      method: 'GET',
      headers: authHeaders,
    });
    const groups = await groupsRes.json();
    const wantName = `[customer] ${(customer.company_name || '').trim().toLowerCase()}`;
    const group = Array.isArray(groups)
      ? groups.find(
          (g) => (g?.group_name || g?.name || '').trim().toLowerCase() === wantName
        )
      : null;

    const groupId = group?.group_id || group?.id;
    if (!groupId) {
      return { assets: [], error: null };
    }

    const membersRes = await fetch(`${baseUrl}/v1/asset_groups/${groupId}/members`, {
      cache: 'no-store',
      method: 'GET',
      headers: authHeaders,
    });
    const body = await membersRes.json();
    const assets = Array.isArray(body?.members)
      ? body.members
      : Array.isArray(body)
          ? body
          : [];
    return { assets, error: null };
  } catch (error) {
    console.error('Error fetching assets by customer:', error);
    return { assets: [], error: error.message };
  }
}
