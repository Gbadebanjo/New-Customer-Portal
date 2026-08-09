import db from '@/database/models';
import { Op } from 'sequelize';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { ServiceConstants } from '@/utils/constants';
import { invalidateAuthorizationCache } from '@/lib/services/authz/getAuthorizedSiteIds';

// AMMP asset groups are named things like "[Customer] Foods & Co". The token
// inside the brackets classifies the group; "[Customer]" is the one we care
// about for authorization. Everything else (e.g. "[Region]", "[Product]") we
// ignore for now — those are cosmetic in AMMP's UI, not access-control.
const CUSTOMER_GROUP_PREFIX = /^\[Customer\]\s*/i;

function normalise(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Full sync:
 *   1. Fetch every AMMP asset group under the master key.
 *   2. Keep only groups whose name starts with "[Customer] ".
 *   3. For each, match the trailing name to one of our Customer records
 *      by normalised company_name equality. Groups with no match are logged
 *      as unmatched so an admin can rename them or add the missing customer.
 *   4. For matched groups, fetch members and upsert one row per (customer_id,
 *      asset_id) into customer_site_mapping with source='group_sync'.
 *   5. Prune rows whose source='group_sync' whose (customer,asset) pair no
 *      longer appears in the current sync — customers lose access to sites
 *      they no longer have.
 *
 * Returns per-run stats so the cron_runs row's summary is useful.
 */
export async function syncAssetGroups() {
    const masterKey = ServiceConstants.AmmpMasterKey || ServiceConstants.AmmpApiKey;
    if (!masterKey) {
        return { ok: false, reason: 'no-master-key' };
    }

    const svc = AmmpServices();
    const { access_token: token } = await svc.getAuthToken(masterKey);
    if (!token) return { ok: false, reason: 'auth-failed' };

    const [groups, customers] = await Promise.all([
        svc.getAssetGroups(token),
        db.Customer.findAll({ raw: true }),
    ]);

    const customerByName = new Map(customers.map((c) => [normalise(c.company_name), c]));
    const customerGroups = (groups || []).filter((g) => CUSTOMER_GROUP_PREFIX.test(g.group_name));

    // Match existing Customer records by normalised name. Anything without
    // a local match gets a Customer created on the fly — bootstraps a fresh
    // install without requiring the admin to hand-enter 121 customer names.
    // NOC can rename any auto-created record later; the mapping links by
    // id, so a rename doesn't break the link.
    const matched = [];
    const created = [];
    for (const g of customerGroups) {
        const stripped = g.group_name.replace(CUSTOMER_GROUP_PREFIX, '').trim();
        if (!stripped) continue;
        let cust = customerByName.get(normalise(stripped));
        if (!cust) {
            try {
                const newCust = await db.Customer.create({ company_name: stripped });
                cust = newCust.get({ plain: true });
                customerByName.set(normalise(stripped), cust);
                created.push({ id: cust.id, company_name: cust.company_name, groupName: g.group_name });
            } catch (err) {
                console.error(`syncAssetGroups: failed to create customer for "${stripped}"`, err);
                continue;
            }
        }
        matched.push({ group: g, customer: cust });
    }

    // Pull members for each matched group in parallel.
    const rowsToUpsert = [];
    await Promise.all(matched.map(async ({ group, customer }) => {
        const memberIds = await svc.getAssetGroupMembers(token, group.group_id);
        for (const assetId of memberIds) {
            rowsToUpsert.push({
                customer_id: customer.id,
                asset_id: String(assetId),
                source: 'group_sync',
                source_ref: `${group.group_id}:${group.group_name}`,
            });
        }
    }));

    // Upsert in bulk. Postgres ON CONFLICT via the unique index we added.
    let mappingRowsInserted = 0;
    let mappingRowsUpdated = 0;
    for (const row of rowsToUpsert) {
        const [rec, isNew] = await db.CustomerSiteMapping.findOrCreate({
            where: { customer_id: row.customer_id, asset_id: row.asset_id },
            defaults: row,
        });
        if (isNew) mappingRowsInserted++;
        else if (rec.source_ref !== row.source_ref) {
            await rec.update({ source_ref: row.source_ref, source: row.source });
            mappingRowsUpdated++;
        }
    }

    // Prune stale group_sync rows for the customers we just re-synced.
    // Manual rows (source != 'group_sync') are always preserved.
    let removed = 0;
    for (const { customer } of matched) {
        const stale = await db.CustomerSiteMapping.findAll({
            where: {
                customer_id: customer.id,
                source: 'group_sync',
                asset_id: {
                    [Op.notIn]: rowsToUpsert
                        .filter((r) => r.customer_id === customer.id)
                        .map((r) => r.asset_id),
                },
            },
        });
        for (const row of stale) {
            await row.destroy();
            removed++;
        }
    }

    // Any authorization decisions cached earlier are now stale.
    invalidateAuthorizationCache();

    return {
        ok: true,
        groupsScanned: (groups || []).length,
        customerGroupsFound: customerGroups.length,
        matched: matched.length,
        customersCreated: created.length,
        newCustomers: created,                 // full list — helps NOC find them
        assetsMapped: rowsToUpsert.length,
        mappingRowsInserted,
        mappingRowsUpdated,
        mappingRowsRemoved: removed,
    };
}
