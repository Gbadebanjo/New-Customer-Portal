'use server'
import models from '@/database/models';
import { v4 as uuidv4 } from "uuid";
import xss from "xss";
import { revalidatePath } from "next/cache";
import { verifyAuth } from "@/lib/auth/auth";

// A caller submitting a new support ticket is always the authenticated
// user — `user_id` and `user_customer` are DERIVED from the session,
// never trusted from the request body. That closes the impersonation
// path where any caller could file tickets as any user.
export default async function AddSupportQueryMessage({ supportCategory, title, description }) {
    const sequelize = models.sequelize;
    let tx;

    try {
        const { user } = await verifyAuth();
        if (!user?.id) throw new Error('Not authenticated');

        // Load the caller's row so we know which customer to attach.
        const caller = await models.User.findByPk(user.id, {
            attributes: ['id', 'customer'],
            raw: true,
        });
        if (!caller) throw new Error('User not found');

        if (!supportCategory || !title || !description) {
            throw new Error("Missing required fields");
        }

        // find status id for 'New' if available; fallback to first status if 'New' not present
        let status = await models.SupportQueryStatus.findOne({ where: { name: 'New' } });
        if (!status) status = await models.SupportQueryStatus.findOne();
        if (!status) throw new Error("No support query status configured");
        const status_id = status.id;

        tx = await sequelize.transaction();

        const support = await models.SupportQuery.create({
            id: uuidv4(),
            title: xss(title),
            description: xss(description),
            customer: caller.customer || null,
            category_id: supportCategory,
            status_id,
            user_id: caller.id,
        }, { transaction: tx });

        // create initial message linked to the created support query
        await models.SupportQueryMessage.create({
            id: uuidv4(),
            message: xss(description),
            support_query_id: support.id,
            user_id: caller.id,
        }, { transaction: tx });

        await tx.commit();

        const supportWithMessages = await models.SupportQuery.findByPk(support.id, {
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] },
                { model: models.SupportQueryMessage, as: 'messages', include: [{ model: models.User, as: 'user', attributes: ['id', 'email'] }] }
            ],
            order: [[{ model: models.SupportQueryMessage, as: 'messages' }, 'created_at', 'ASC']]
        });

        const result = supportWithMessages ? supportWithMessages.toJSON() : null;

        revalidatePath('/support');

        return { supportQuery: result };
    } catch (err) {
        if (tx) await tx.rollback();
        console.error("Error adding support query:", err && err.message);
        throw err;
    }
}
