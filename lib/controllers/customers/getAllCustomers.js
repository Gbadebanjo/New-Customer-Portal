import models from "@/database/models";
export const dynamic = "force dynamic";

export default async function getAllCustomers() {
        const customers = await models.Customer.findAll({
            order: [['company_name', 'ASC']],
            raw: true
        });
        return customers;

}
