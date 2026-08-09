'use server';
import { Op, fn, col } from 'sequelize';
import db from '@/database/models';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { ServiceConstants } from '@/utils/constants';
import { verifyAuth } from '@/lib/auth/auth';
import { invalidateAuthorizationCache } from '@/lib/services/authz/getAuthorizedSiteIds';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

async function requireAdmin() {
    const { user } = await verifyAuth();
    if (!user?.id) return null;
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => ADMIN_ROLES.has(r?.name))) return null;
    return full;
}

/**
 * All local Customer records + their current site-mapping counts. Includes
 * a `mappedSourceRef` sample so the UI can show which AMMP group this
 * customer is currently linked to.
 */
export async function listCustomerMappings() {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };

    const [customers, counts] = await Promise.all([
        db.Customer.findAll({
            attributes: ['id', 'company_name', 'created_at'],
            order: [['company_name', 'ASC']],
            raw: true,
        }),
        db.CustomerSiteMapping.findAll({
            attributes: [
                'customer_id',
                [fn('COUNT', col('id')), 'count'],
                [fn('MIN', col('source_ref')), 'source_ref'],
            ],
            group: ['customer_id'],
            raw: true,
        }),
    ]);

    const countsById = new Map(counts.map((c) => [c.customer_id, c]));
    return {
        ok: true,
        customers: customers.map((c) => {
            const row = countsById.get(c.id);
            return {
                id: c.id,
                name: c.company_name,
                createdAt: c.created_at,
                siteCount: row ? Number(row.count) : 0,
                linkedAmmpGroup: row?.source_ref || null,
            };
        }),
    };
}

/**
 * List every AMMP `[Customer] X` group with its member count. Used by the
 * UI to let an admin pick which group to bind a local Customer to.
 */
export async function listAmmpCustomerGroups() {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };

    const masterKey = ServiceConstants.AmmpMasterKey || ServiceConstants.AmmpApiKey;
    if (!masterKey) return { ok: false, error: 'No AMMP key configured' };

    const svc = AmmpServices();
    const { access_token: token } = await svc.getAuthToken(masterKey);
    if (!token) return { ok: false, error: 'AMMP auth failed' };

    const all = await svc.getAssetGroups(token);
    const customerGroups = (all || [])
        .filter((g) => /^\[Customer\]/i.test(g.group_name))
        .map((g) => ({
            groupId: g.group_id,
            groupName: g.group_name,
            displayName: g.group_name.replace(/^\[Customer\]\s*/i, '').trim(),
        }));

    // Fetch member counts in parallel (limited concurrency inside AmmpServices).
    const withCounts = await Promise.all(customerGroups.map(async (g) => {
        const members = await svc.getAssetGroupMembers(token, g.groupId);
        return { ...g, memberCount: Array.isArray(members) ? members.length : 0 };
    }));

    withCounts.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { ok: true, groups: withCounts };
}

/**
 * Bind a local Customer record to an AMMP group. Inserts mapping rows for
 * every asset in the group under this customer_id. Existing mapping rows
 * from a previous auto-sync are removed first so the two don't fight.
 *
 * If `mergeFromCustomerId` is passed, that customer's mapping rows are
 * re-parented onto the target customer_id first, and the source customer
 * row is deleted — used to eliminate the duplicate customer that the
 * auto-create pass produced.
 */
export async function linkCustomerToAmmpGroup({
    customerId,
    groupId,
    mergeFromCustomerId = null,
}) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!customerId || !groupId) return { ok: false, error: 'Missing arguments' };

    const target = await db.Customer.findByPk(customerId, { raw: true });
    if (!target) return { ok: false, error: 'Target customer not found' };

    const masterKey = ServiceConstants.AmmpMasterKey || ServiceConstants.AmmpApiKey;
    if (!masterKey) return { ok: false, error: 'No AMMP key configured' };

    const svc = AmmpServices();
    const { access_token: token } = await svc.getAuthToken(masterKey);
    if (!token) return { ok: false, error: 'AMMP auth failed' };

    // Get the group's asset ids + its name for the source_ref audit.
    const groups = await svc.getAssetGroups(token);
    const group = (groups || []).find((g) => g.group_id === groupId);
    if (!group) return { ok: false, error: 'AMMP group not found' };
    const memberIds = await svc.getAssetGroupMembers(token, groupId);

    // Clear any pre-existing group_sync rows for the target customer so a
    // rebind is idempotent. Manual rows are preserved.
    await db.CustomerSiteMapping.destroy({
        where: { customer_id: customerId, source: 'group_sync' },
    });

    // Optional merge: pull mapping rows off the duplicate customer.
    let mergedFrom = null;
    if (mergeFromCustomerId && mergeFromCustomerId !== customerId) {
        await db.CustomerSiteMapping.destroy({
            where: { customer_id: mergeFromCustomerId },
        });
        // Also delete the duplicate customer record itself — it was an
        // auto-created stub and is no longer needed.
        const dup = await db.Customer.findByPk(mergeFromCustomerId);
        if (dup) {
            mergedFrom = { id: dup.id, name: dup.company_name };
            await dup.destroy();
        }
    }

    // Insert the fresh mapping rows.
    let inserted = 0;
    for (const assetId of memberIds) {
        const [, isNew] = await db.CustomerSiteMapping.findOrCreate({
            where: { customer_id: customerId, asset_id: String(assetId) },
            defaults: {
                customer_id: customerId,
                asset_id: String(assetId),
                source: 'group_sync',
                source_ref: `${group.group_id}:${group.group_name}`,
            },
        });
        if (isNew) inserted++;
    }

    invalidateAuthorizationCache();

    return {
        ok: true,
        customerName: target.company_name,
        groupName: group.group_name,
        assetsLinked: memberIds.length,
        mappingRowsInserted: inserted,
        mergedFrom,
    };
}

/**
 * Delete an empty Customer record (no mappings, no users). Used to clean
 * up the sync's auto-created stubs after merging.
 */
export async function deleteEmptyCustomer(customerId) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!customerId) return { ok: false, error: 'Missing customerId' };

    const [siteCount, userCount] = await Promise.all([
        db.CustomerSiteMapping.count({ where: { customer_id: customerId } }),
        db.User.count({ where: { customer: customerId } }),
    ]);
    if (siteCount > 0 || userCount > 0) {
        return { ok: false, error: `Customer has ${siteCount} sites and ${userCount} users — clear those first.` };
    }
    const [affected] = await db.Customer.destroy({ where: { id: customerId } }) ? [1] : [0];
    return { ok: true, deleted: affected };
}
