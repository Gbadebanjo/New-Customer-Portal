'use server'
import models from "@/database/models";
export default async function getCustomerById(customerId) {
    const customer = await models.Customer.findByPk(customerId, { raw: true });
    return { customer };
}
