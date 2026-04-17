import db from '@/database/models';

export const dynamic = "force dynamic";

export default async function getAllSupportQueries(userId) {
    // Look up the user to check their roles and customer
    const user = await db.User.findByPk(userId, { raw: true });

    if (!user) {
        return { supportQueries: [] };
    }

    // Check if user has ONLY the "Customer" role
    const roles = user.roles || [];
    const isCustomerOnly = roles.length > 0 &&
        roles.every(role => role.name === 'Customer');

    const queryOptions = {
        order: [['created_at', 'DESC']],
        raw: true,
    };

    // If user is only a customer, filter by their customer ID
    if (isCustomerOnly && user.customer) {
        queryOptions.where = { customer: user.customer };
    }

    const supportQueries = await db.SupportQuery.findAll(queryOptions);
    return { supportQueries };
}
