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
    return await db.User.findOne({ where: { email } });
}
