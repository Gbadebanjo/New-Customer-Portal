'use server';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { generateApiKey, hashApiKey } from '@/lib/services/publicApi/apiKeys';

const NOC_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

async function requireAdmin() {
    const { user } = await verifyAuth();
    if (!user?.id) return null;
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => NOC_ROLES.has(r?.name))) return null;
    return full;
}

/**
 * List every key (active + revoked) with the raw hash stripped. Includes
 * the human-readable prefix so admins can identify a key at a glance.
 */
export async function listApiKeys() {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };

    const rows = await db.ApiKey.findAll({
        order: [['created_at', 'DESC']],
        raw: true,
    });

    return {
        ok: true,
        keys: rows.map((r) => ({
            id: r.id,
            label: r.label,
            keyPrefix: r.key_prefix,
            customerId: r.customer_id,
            scope: r.scope,
            createdAt: r.created_at,
            createdByUserId: r.created_by_user_id,
            revokedAt: r.revoked_at,
            lastUsedAt: r.last_used_at,
        })),
    };
}

/**
 * Generate a new key. Returns the raw key ONCE in the response — the caller
 * must show it to the admin then discard. Nothing on the server ever stores
 * the raw value.
 *
 * scope: 'customer' (needs customerId) or 'fleet' (customerId ignored).
 */
export async function createApiKey({ label, scope, customerId }) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
        return { ok: false, error: 'Label is required' };
    }
    if (scope !== 'customer' && scope !== 'fleet') {
        return { ok: false, error: 'Scope must be "customer" or "fleet"' };
    }
    if (scope === 'customer' && (!customerId || typeof customerId !== 'string')) {
        return { ok: false, error: 'customerId is required for customer-scoped keys' };
    }

    const raw = generateApiKey();
    const row = await db.ApiKey.create({
        key_hash: hashApiKey(raw),
        key_prefix: raw.slice(0, 12),
        label: label.trim(),
        customer_id: scope === 'customer' ? customerId : null,
        scope,
        created_by_user_id: admin.id,
    });

    return {
        ok: true,
        key: raw, // Shown once, never returned again.
        row: {
            id: row.id,
            label: row.label,
            keyPrefix: row.key_prefix,
            customerId: row.customer_id,
            scope: row.scope,
            createdAt: row.created_at,
        },
    };
}

/** Revoke an active key. No-op if already revoked. */
export async function revokeApiKey(id) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!id) return { ok: false, error: 'id required' };

    const [affected] = await db.ApiKey.update(
        { revoked_at: new Date() },
        { where: { id, revoked_at: null } }
    );
    return { ok: true, revoked: affected };
}
