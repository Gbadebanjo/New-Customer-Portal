'use server'
import models from "@/database/models";
import { verifyAuth } from "@/lib/auth/auth";

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// The full customer row includes the `users` JSONB array (user id
// links per customer). Gate so a Customer user can only fetch their
// own customer's row; Daystar-side users can fetch any.
export default async function getCustomerById(customerId) {
    const { user } = await verifyAuth();
    if (!user?.id) return { customer: null };
    if (!customerId) return { customer: null };

    const caller = await models.User.findByPk(user.id, {
        attributes: ['id', 'roles', 'customer'],
        raw: true,
    });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

    if (!isDaystar && String(caller?.customer) !== String(customerId)) {
        return { customer: null };
    }

    const customer = await models.Customer.findByPk(customerId, { raw: true });
    return { customer };
}
