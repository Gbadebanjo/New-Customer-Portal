'use server'
import db from "@/database/models";

// Fields never sent back to the client. `getUserById` is a server action
// bundled into the client for admin surfaces (edit-user modal, layout
// bootstrap, /api/auth/me). Even though only Daystar-role pages render
// those callers, the action's RPC handler is reachable from any client
// with a valid Next.js action token — so we strip sensitive columns at
// the source rather than relying on every caller to destructure carefully.
const SENSITIVE_FIELDS = ['password', 'totp_secret', 'totp_temp_secret'];

export default async function getUserById(userId) {
    if (!userId) return { user: null };
    const user = await db.User.findByPk(userId);
    if (!user) return { user: null };
    const json = user.toJSON();
    for (const f of SENSITIVE_FIELDS) delete json[f];
    return { user: json };
}
