// NOTE: intentionally NOT a server action ('use server' removed).
// This function returns the full user row including the password hash
// (that's what the login flow needs to call verifyPassword). If it were
// a server action, its RPC handler would be bundled into the client and
// callable via devtools with any email — leaking password hashes and
// enabling account enumeration.
//
// Only server-side importers (e.g. lib/auth/authActions.js) can use
// this. Any client component that tries to import it will fail the
// Next.js build.
import db from "@/database/models";

export default async function getUserByEmail(email) {
    // Trim + lowercase so that lookups match how AddUser / seeders /
    // edit-user write the column. Without this, a user who typed
    // `Alice@Example.com` at login would fail to match the DB row
    // stored as `alice@example.com` (Postgres text lookups are
    // case-sensitive by default).
    const normalised = typeof email === 'string' ? email.trim().toLowerCase() : email;
    if (!normalised) return null;
    return await db.User.findOne({ where: { email: normalised } });
}
