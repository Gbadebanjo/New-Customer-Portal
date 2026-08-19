'use server';
import UserRole from '@/database/models/UserRole';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';

// Editable columns on a role row. `normalized_name` is deliberately
// server-derived from `name` — never accepted from the client — so a
// rename can't decouple the display name from the key that auth
// guards match against.
const ALLOWED_FIELDS = ['name', 'btn_tags'];

// Canonical role names that admin gates (`requireAdminAuth`,
// `requireWriteAdminAuth`, per-page role checks) match against by exact
// string. Renaming any of these silently downgrades every account
// carrying that role, so we refuse.
const RESERVED_ROLE_NAMES = new Set([
    'Admin',
    'Daystar Portal Admin',
    'Daystar Customer Admin',
    'Customer',
]);

export default async function updateUserRoleById(userRoleId, newData) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { error: gate.error };
    if (!userRoleId) return { error: 'Missing role id' };

    const clean = {};
    for (const key of ALLOWED_FIELDS) {
        if (newData && Object.prototype.hasOwnProperty.call(newData, key)) {
            clean[key] = newData[key];
        }
    }

    // If the client is asking to change `name`, block the rename when
    // either the current name OR the new name is a reserved role.
    if ('name' in clean) {
        const existing = await UserRole.findByPk(userRoleId, { raw: true });
        if (!existing) return { error: 'Role not found' };
        if (
            RESERVED_ROLE_NAMES.has(existing.name) ||
            RESERVED_ROLE_NAMES.has(String(clean.name).trim())
        ) {
            return { error: 'Reserved role names cannot be renamed.' };
        }
        // Keep the normalized name in lock-step with the display name.
        clean.normalized_name = String(clean.name).trim().toUpperCase();
    }

    const [updatedRowsCount] = await UserRole.update(clean, {
        where: { id: userRoleId },
    });
    return { updatedRowsCount };
}
